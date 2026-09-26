import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

function getAdminApp() {
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY)
    throw new Error(
      "Firebase Admin is not configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env.",
    );

  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    })
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminMessaging() {
  return getMessaging(getAdminApp());
}

export async function authorizeAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new Error("Authentication required.");

  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(authorization.slice(7));
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (
    allowedEmails.length &&
    !decoded.admin &&
    (!decoded.email || !allowedEmails.includes(decoded.email))
  )
    throw new Error("Administrator access required.");

  return decoded;
}

export function adminErrorResponse(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : "Unable to complete request.";
  const message = rawMessage.includes("EACCES")
    ? "Firebase Admin request was blocked by the local environment. Restart the dev server with network access and try again."
    : rawMessage;
  const status = message.includes("configured")
    ? 503
    : message.includes("Authentication") || message.includes("id-token")
      ? 401
      : message.includes("blocked")
        ? 503
        : message.includes("access")
          ? 403
          : 400;

  return { message, status };
}

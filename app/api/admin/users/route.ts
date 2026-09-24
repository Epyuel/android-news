import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminAuth() {
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY)
    throw new Error(
      "Firebase Admin is not configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env.",
    );
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  return getAuth(app);
}

async function authorize(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new Error("Authentication required.");
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(authorization.slice(7));
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  if (!allowedEmails.length) return adminAuth;
  if (
    !decoded.admin &&
    (!decoded.email || !allowedEmails.includes(decoded.email))
  )
    throw new Error("Administrator access required.");
  return adminAuth;
}

type SerializableUser = {
  uid: string;
  email?: string;
  displayName?: string;
  customClaims?: Record<string, unknown>;
};

function serializeUser(user: SerializableUser) {
  return {
    id: user.uid,
    username: String(
      user.customClaims?.username ?? user.email?.split("@")[0] ?? user.uid,
    ),
    fullName: user.displayName ?? "",
    email: user.email ?? "",
  };
}

function errorResponse(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : "Unable to manage administrators.";
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
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const adminAuth = await authorize(request);
    const users: ReturnType<typeof serializeUser>[] = [];
    let result = await adminAuth.listUsers(1000);
    users.push(...result.users.map(serializeUser));
    while (result.pageToken) {
      result = await adminAuth.listUsers(1000, result.pageToken);
      users.push(...result.users.map(serializeUser));
    }
    return NextResponse.json({ users });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const adminAuth = await authorize(request);
    const body = (await request.json()) as {
      username?: string;
      fullName?: string;
      email?: string;
      password?: string;
    };
    if (
      !body.username ||
      !body.fullName ||
      !body.email ||
      !body.password ||
      body.password.length < 6
    )
      return NextResponse.json(
        {
          error:
            "Username, full name, email, and a 6-character password are required.",
        },
        { status: 400 },
      );
    const user = await adminAuth.createUser({
      email: body.email,
      password: body.password,
      displayName: body.fullName,
    });
    await adminAuth.setCustomUserClaims(user.uid, {
      admin: true,
      username: body.username,
    });
    return NextResponse.json({
      user: serializeUser({
        ...user,
        customClaims: { admin: true, username: body.username },
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const adminAuth = await authorize(request);
    const body = (await request.json()) as {
      id?: string;
      fullName?: string;
      email?: string;
      password?: string;
    };
    if (!body.id || !body.fullName || !body.email)
      return NextResponse.json(
        { error: "User id, full name, and email are required." },
        { status: 400 },
      );
    const user = await adminAuth.updateUser(body.id, {
      displayName: body.fullName,
      email: body.email,
      ...(body.password ? { password: body.password } : {}),
    });
    return NextResponse.json({ user: serializeUser(user) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const adminAuth = await authorize(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "User id is required." },
        { status: 400 },
      );
    await adminAuth.deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

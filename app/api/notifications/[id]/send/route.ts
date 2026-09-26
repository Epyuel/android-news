import { NextResponse } from "next/server";
import {
  adminErrorResponse,
  authorizeAdmin,
  getAdminMessaging,
} from "@/lib/firebase-admin";

type RouteContext = { params: Promise<{ id: string }> };
type NotificationPayload = {
  title?: string;
  message?: string;
  image?: string;
  url?: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await authorizeAdmin(request);
    const { id } = await context.params;
    const payload = (await request.json()) as NotificationPayload;
    if (!payload.title?.trim() || !payload.message?.trim())
      throw new Error("A title and message are required to send a notification.");

    const topic = process.env.FCM_NOTIFICATION_TOPIC || "news";
    const messageId = await getAdminMessaging().send({
      topic,
      notification: {
        title: payload.title.trim(),
        body: payload.message.trim(),
        ...(payload.image ? { imageUrl: payload.image } : {}),
      },
      data: {
        type: "notification",
        notificationId: id,
        title: payload.title.trim(),
        message: payload.message.trim(),
        image: payload.image || "",
        url: payload.url || "",
      },
    });
    return NextResponse.json({ success: true, messageId, topic });
  } catch (error) {
    const { message, status } = adminErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

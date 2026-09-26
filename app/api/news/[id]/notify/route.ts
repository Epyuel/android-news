import { NextResponse } from "next/server";
import {
  adminErrorResponse,
  authorizeAdmin,
  getAdminMessaging,
} from "@/lib/firebase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function truncateText(value: string, maxLength = 140) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trim()}...`
    : normalized;
}

type NotificationPayload = {
  title?: string;
  descriptionText?: string;
  image?: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await authorizeAdmin(request);
    const { id } = await context.params;
    const data = (await request.json()) as NotificationPayload;
    if (!data.title?.trim() || !data.descriptionText?.trim())
      throw new Error("A title and description are required to send a notification.");

    const topic = process.env.FCM_NEWS_TOPIC || "news";
    const response = await getAdminMessaging().send({
      topic,
      notification: {
        title: data.title.trim(),
        body: truncateText(data.descriptionText),
      },
      data: {
        type: "news",
        newsId: id,
        title: data.title.trim(),
        image: data.image || "",
      },
    });

    return NextResponse.json({ success: true, messageId: response, topic });
  } catch (error) {
    const { message, status } = adminErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

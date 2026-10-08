import { NextResponse } from "next/server";
import {
  adminErrorResponse,
  authorizeAdmin,
  sendPushToRegisteredDevices,
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

    await sendPushToRegisteredDevices({
      title: data.title.trim(),
      body: truncateText(data.descriptionText),
      image: data.image,
      data: {
        type: "news",
        newsId: id,
        title: data.title.trim(),
        image: data.image || "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { message, status } = adminErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

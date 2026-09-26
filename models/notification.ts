export interface NewsNotification {
  id: string;
  title: string;
  image: string;
  message: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NotificationInput = Omit<
  NewsNotification,
  "id" | "createdAt" | "updatedAt"
>;

export type NewsStatus = "active" | "inactive";

export type NewsContentType = "standard" | "breaking" | "featured";

export interface News {
  id: string;
  title: string;
  date: string;
  categoryId: string;
  type: NewsContentType;
  image: string;
  description: string;
  descriptionText: string;
  status: NewsStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type NewsInput = Omit<News, "id" | "createdAt" | "updatedAt">;

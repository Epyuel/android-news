export type VideoStatus = "published" | "unpublished";

export interface NewsVideo {
  id: string;
  title: string;
  videoUrl: string;
  status: VideoStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type NewsVideoInput = Omit<NewsVideo, "id" | "createdAt" | "updatedAt">;

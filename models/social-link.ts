export type SocialLinkStatus = "active" | "inactive";

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  status: SocialLinkStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type SocialLinkInput = Omit<SocialLink, "id" | "createdAt" | "updatedAt">;

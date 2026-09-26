export interface Category {
  id: string;
  name: string;
  image: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CategoryInput = Omit<Category, "id" | "createdAt" | "updatedAt">;

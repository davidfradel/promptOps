export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  keywords: string[];
  niche: string | null;
  createdAt: Date;
  updatedAt: Date;
}

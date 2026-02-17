export interface User {
  id: string;
  email: string;
  name: string | null;
  onboardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  token: string;
  user: User;
}

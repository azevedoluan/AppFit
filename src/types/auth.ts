export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'email' | 'google';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

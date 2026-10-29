export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'local';
  isEmailVerified: boolean;
  role?: 'user' | 'admin';
  isBlocked?: boolean;
  createdAt: string;
}

export interface PendingVerification {
  name: string;
  email: string;
  password?: string;
  provider?: 'email' | 'google';
  avatarUrl?: string;
  code: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: { email: string; password: string }) => Promise<boolean>;
  logout: () => void;
}

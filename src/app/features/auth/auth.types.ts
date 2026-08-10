export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<boolean>;
  logout: () => void;
}

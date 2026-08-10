export interface AuthInstitution {
  id: string | number;
  name: string;
  type: "PLATFORM_OWNER" | "PLATFORM_USER";
}

export interface AuthProfile {
  id: string | number;
  name: string;
}

export interface AuthUser {
  id: string | number;
  username: string;
  institution: AuthInstitution | null;
  profile: AuthProfile | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<boolean>;
  logout: () => void;
}

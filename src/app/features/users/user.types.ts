export interface User {
  id: string | number;
  username: string;
  profile: { id: string | number; name: string } | null;
  institution: { id: string | number; name: string } | null;
  status?: string;
  auth_status?: string;
  created_at?: string;
  created_by?: { id: string | number; username: string; name: string } | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  profile_id: string | number;
  remark?: string | null;
}

export interface UpdateUserPayload {
  profile_id: string | number;
  remark?: string | null;
}

export interface RemarkPayload {
  remark?: string | null;
}

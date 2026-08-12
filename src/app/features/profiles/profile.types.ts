export interface Profile {
  id: string | number;
  code: string;
  name: string;
  status?: string;
  auth_status?: string;
  institution: { id: string | number; name: string } | null;
  permissions?: Permission[];
  created_by?: { id: string | number; name: string } | null;
  created_at?: string;
}

export interface Permission {
  menu_code: string;
  action_code: string;
}

export interface CreateProfilePayload {
  code: string;
  name: string;
  institution_id: string | number;
  remark?: string | null;
}

export interface UpdateProfilePayload {
  name?: string;
  remark?: string | null;
}

export interface SetPermissionsPayload {
  permissions: Permission[];
  remark?: string | null;
}

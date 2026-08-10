export interface Profile {
  id: string | number;
  code: string;
  name: string;
  status?: string;
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
}

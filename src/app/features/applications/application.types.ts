export interface Application {
  id: string | number;
  code: string;
  name: string;
  description?: string | null;
  status?: string;
  auth_status?: string;
}

export interface CreateApplicationPayload {
  code: string;
  name: string;
  remark?: string | null;
}

export interface UpdateApplicationPayload {
  name?: string;
  remark?: string | null;
}

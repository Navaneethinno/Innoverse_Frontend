export interface Application {
  id: string | number;
  code: string;
  name: string;
  description?: string | null;
  status?: string;
}

export interface CreateApplicationPayload {
  code: string;
  name: string;
}

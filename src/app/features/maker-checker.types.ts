export interface NamedRef {
  id: string | number;
  name: string;
}

export interface PendingRequestOut {
  request_id: string;
  entity_type: string;
  entity_id: string | number;
  action: "ADD" | "EDIT" | "DELETE" | "ACTIVATE" | "DEACTIVATE";
  auth_status: string;
  maker: NamedRef;
  required_checker_count: number;
  approval_count: number;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  remark: string | null;
  created_at: string;
}

export interface AuditEntryOut {
  id: string | number;
  request_id: string;
  entity_id: string | number;
  entity_type: string;
  action: string;
  auth_status: string;
  event_type: string;
  maker: NamedRef | null;
  checker: NamedRef | null;
  decision: "APPROVE" | "REJECT" | null;
  required_checker_count: number;
  approval_count: number;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  remark: string | null;
  created_at: string;
}

export interface CheckerDecisionRequest {
  remark?: string | null;
}

export interface MakerCheckerResponse {
  request_id: string;
  message: string;
}

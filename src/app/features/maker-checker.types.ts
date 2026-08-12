export interface NamedRef {
  id: string | number;
  name: string;
}

export interface CheckerAssignmentIn {
  user_id: string | number;
  sequence?: number;
}

export interface CheckerConfigPayload {
  checker_mode?: "ANY" | "ASSIGNED_PARALLEL" | "ASSIGNED_SEQUENTIAL";
  checker_assignments?: CheckerAssignmentIn[];
  required_checker_count?: number | null;
}

export interface PendingRequestOut {
  audit_key: string;
  request_id: string;
  entity_type: string;
  entity_id: string | number;
  action: "ADD" | "EDIT" | "DELETE" | "ACTIVATE" | "DEACTIVATE";
  auth_status: string;
  maker: NamedRef;
  checker?: NamedRef | null;
  checker_mode?: "ANY" | "ASSIGNED_PARALLEL" | "ASSIGNED_SEQUENTIAL" | null;
  checker_assignments?: Array<Record<string, unknown>> | null;
  required_checker_count: number;
  approval_count: number;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  remark: string | null;
  created_at: string;
  sequence_no?: number;
}

export interface AuditEntryOut {
  id: string | number;
  audit_key?: string;
  request_id: string;
  sequence_no?: number;
  entity_id: string | number;
  entity_type: string;
  action: string;
  auth_status: string;
  event_type: string;
  maker: NamedRef | null;
  checker: NamedRef | null;
  decision: "APPROVE" | "REJECT" | null;
  checker_mode?: "ANY" | "ASSIGNED_PARALLEL" | "ASSIGNED_SEQUENTIAL" | null;
  checker_assignments?: Array<Record<string, unknown>> | null;
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

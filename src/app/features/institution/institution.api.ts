import { apiService } from "../../features/api.service";
import type { Institution, CreateInstitutionPayload, UpdateInstitutionPayload, RemarkPayload } from "./institution.types";
import type { PendingRequestOut, AuditEntryOut, MakerCheckerResponse, CheckerDecisionRequest } from "../maker-checker.types";

export const institutionApi = {
  list: (): Promise<Institution[]> => apiService.getInstitutions(),

  listPending: (): Promise<PendingRequestOut[]> => apiService.getPendingInstitutions(),

  getById: (id: string): Promise<Institution | null> => apiService.getInstitutionById(id),

  create: (payload: CreateInstitutionPayload): Promise<MakerCheckerResponse> =>
    apiService.createInstitution(payload),

  update: (id: string | number, payload: UpdateInstitutionPayload): Promise<MakerCheckerResponse> =>
    apiService.updateInstitution(id, payload),

  delete: (id: string | number, payload?: RemarkPayload): Promise<MakerCheckerResponse> =>
    apiService.deleteInstitution(id, payload),

  activate: (id: string | number, payload?: RemarkPayload): Promise<MakerCheckerResponse> =>
    apiService.activateInstitution(id, payload),

  deactivate: (id: string | number, payload?: RemarkPayload): Promise<MakerCheckerResponse> =>
    apiService.deactivateInstitution(id, payload),

  getAudit: (id: string | number): Promise<AuditEntryOut[]> =>
    apiService.getInstitutionAudit(id),

  approve: (request_id: string, payload?: CheckerDecisionRequest): Promise<MakerCheckerResponse> =>
    apiService.approveInstitution(request_id, payload),

  reject: (request_id: string, payload?: CheckerDecisionRequest): Promise<MakerCheckerResponse> =>
    apiService.rejectInstitution(request_id, payload),

  continueRejectedAdd: (
    request_id: string,
    payload: { after_data?: Record<string, unknown>; remark?: string | null },
    mode: "edit" | "delete",
  ): Promise<MakerCheckerResponse> => apiService.continueRejectedInstitutionAdd(request_id, payload, mode),
};

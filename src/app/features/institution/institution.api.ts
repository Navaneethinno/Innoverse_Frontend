import { apiService } from "../../features/api.service";
import type { Institution } from "./institution.types";

export const institutionApi = {
  list: async (): Promise<Institution[]> => {
    return apiService.getInstitutions();
  },

  listPending: async (): Promise<Institution[]> => {
    return apiService.getPendingInstitutions();
  },

  getById: async (id: string): Promise<Institution | null> => {
    return apiService.getInstitutionById(id);
  },

  create: async (payload: Partial<Institution>): Promise<Institution> => {
    return apiService.createInstitution(payload);
  },

  approve: async (id: string | number): Promise<void> => {
    return apiService.approveInstitution(id);
  },

  reject: async (id: string | number): Promise<void> => {
    return apiService.rejectInstitution(id);
  },
};

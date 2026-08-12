import { create } from "zustand";
import type { Institution, CreateInstitutionPayload, UpdateInstitutionPayload, RemarkPayload } from "./institution.types";
import type { PendingRequestOut, AuditEntryOut, MakerCheckerResponse, CheckerDecisionRequest } from "../maker-checker.types";
import { institutionApi } from "./institution.api";

interface InstitutionStore {
  institutions: Institution[];
  pendingInstitutions: PendingRequestOut[];
  selectedInstitutionId: string;
  isLoading: boolean;
  error: string | null;
  fetchInstitutions: () => Promise<void>;
  fetchPendingInstitutions: () => Promise<void>;
  fetchInstitutionById: (id: string) => Promise<Institution | null>;
  createInstitution: (payload: CreateInstitutionPayload) => Promise<MakerCheckerResponse | null>;
  updateInstitution: (id: string | number, payload: UpdateInstitutionPayload) => Promise<MakerCheckerResponse | null>;
  deleteInstitution: (id: string | number, payload?: RemarkPayload) => Promise<MakerCheckerResponse | null>;
  activateInstitution: (id: string | number, payload?: RemarkPayload) => Promise<MakerCheckerResponse | null>;
  deactivateInstitution: (id: string | number, payload?: RemarkPayload) => Promise<MakerCheckerResponse | null>;
  getInstitutionAudit: (id: string | number) => Promise<AuditEntryOut[]>;
  approveInstitution: (request_id: string, payload?: CheckerDecisionRequest) => Promise<boolean>;
  rejectInstitution: (request_id: string, payload?: CheckerDecisionRequest) => Promise<boolean>;
  continueRejectedAdd: (request_id: string, payload: { after_data?: Record<string, unknown>; remark?: string | null }, mode: "edit" | "delete") => Promise<MakerCheckerResponse | null>;
  setSelectedInstitutionId: (id: string) => void;
  updateInstitutionInList: (institution: Institution | null) => void;
}

export const useInstitutionStore = create<InstitutionStore>((set) => ({
  institutions: [],
  pendingInstitutions: [],
  selectedInstitutionId: "",
  isLoading: false,
  error: null,

  fetchInstitutions: async () => {
    set({ isLoading: true, error: null });
    try {
      const institutions = await institutionApi.list();
      set({ institutions, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load institutions", isLoading: false });
    }
  },

  fetchPendingInstitutions: async () => {
    set({ isLoading: true, error: null });
    try {
      const pendingInstitutions = await institutionApi.listPending();
      set({ pendingInstitutions, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load pending institutions", isLoading: false });
    }
  },

  fetchInstitutionById: async (id) => {
    set({ selectedInstitutionId: id, isLoading: true, error: null });
    try {
      const institution = await institutionApi.getById(id);
      if (!institution) {
        set({ error: "Institution not found", isLoading: false });
        return null;
      }
      set({ isLoading: false });
      return institution;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load institution", isLoading: false });
      return null;
    }
  },

  createInstitution: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const result = await institutionApi.create(payload);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create institution", isLoading: false });
      return null;
    }
  },

  updateInstitution: async (id, payload) => {
    set({ error: null });
    try {
      return await institutionApi.update(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update institution" });
      return null;
    }
  },

  deleteInstitution: async (id, payload) => {
    set({ error: null });
    try {
      return await institutionApi.delete(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete institution" });
      return null;
    }
  },

  activateInstitution: async (id, payload) => {
    set({ error: null });
    try {
      return await institutionApi.activate(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to activate institution" });
      return null;
    }
  },

  deactivateInstitution: async (id, payload) => {
    set({ error: null });
    try {
      return await institutionApi.deactivate(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to deactivate institution" });
      return null;
    }
  },

  getInstitutionAudit: async (id) => {
    try {
      return await institutionApi.getAudit(id);
    } catch {
      return [];
    }
  },

  approveInstitution: async (request_id, payload) => {
    set({ error: null });
    try {
      await institutionApi.approve(request_id, payload);
      set((state) => ({
        pendingInstitutions: state.pendingInstitutions.filter((r) => r.request_id !== request_id),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to approve institution" });
      return false;
    }
  },

  rejectInstitution: async (request_id, payload) => {
    set({ error: null });
    try {
      await institutionApi.reject(request_id, payload);
      set((state) => ({
        pendingInstitutions: state.pendingInstitutions.filter((r) => r.request_id !== request_id),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to reject institution" });
      return false;
    }
  },

  continueRejectedAdd: async (request_id, payload, mode) => {
    set({ error: null });
    try {
      return await institutionApi.continueRejectedAdd(request_id, payload, mode);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to continue rejected institution request" });
      return null;
    }
  },

  setSelectedInstitutionId: (id) => set({ selectedInstitutionId: id }),

  updateInstitutionInList: (institution) => {
    if (!institution) return;
    set((state) => ({
      institutions: state.institutions.map((item) => (item.id === institution.id ? institution : item)),
    }));
  },
}));

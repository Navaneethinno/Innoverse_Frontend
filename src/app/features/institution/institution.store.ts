import { create } from "zustand";
import type { Institution } from "./institution.types";
import { institutionApi } from "./institution.api";

interface InstitutionStore {
  institutions: Institution[];
  pendingInstitutions: Institution[];
  selectedInstitutionId: string;
  isLoading: boolean;
  error: string | null;
  fetchInstitutions: () => Promise<void>;
  fetchPendingInstitutions: () => Promise<void>;
  fetchInstitutionById: (id: string) => Promise<Institution | null>;
  createInstitution: (payload: Partial<Institution>) => Promise<Institution | null>;
  approveInstitution: (id: string | number) => Promise<boolean>;
  rejectInstitution: (id: string | number) => Promise<boolean>;
  setSelectedInstitutionId: (id: string) => void;
  updateInstitution: (institution: Institution | null) => void;
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
      const created = await institutionApi.create(payload);
      set((state) => ({ institutions: [...state.institutions, created], isLoading: false }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create institution", isLoading: false });
      return null;
    }
  },

  approveInstitution: async (id) => {
    set({ error: null });
    try {
      await institutionApi.approve(id);
      set((state) => ({
        pendingInstitutions: state.pendingInstitutions.filter((i) => String(i.id) !== String(id)),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to approve institution" });
      return false;
    }
  },

  rejectInstitution: async (id) => {
    set({ error: null });
    try {
      await institutionApi.reject(id);
      set((state) => ({
        pendingInstitutions: state.pendingInstitutions.filter((i) => String(i.id) !== String(id)),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to reject institution" });
      return false;
    }
  },

  setSelectedInstitutionId: (id) => set({ selectedInstitutionId: id }),

  updateInstitution: (institution) => {
    if (!institution) return;
    set((state) => ({
      institutions: state.institutions.map((item) => (item.id === institution.id ? institution : item)),
    }));
  },
}));

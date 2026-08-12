import { create } from "zustand";
import type { Profile, CreateProfilePayload, UpdateProfilePayload, SetPermissionsPayload } from "./profile.types";
import type { PendingRequestOut, AuditEntryOut, MakerCheckerResponse, CheckerDecisionRequest } from "../maker-checker.types";
import { apiService } from "../api.service";

interface ProfileStore {
  profiles: Profile[];
  pendingProfiles: PendingRequestOut[];
  isLoading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
  fetchPendingProfiles: () => Promise<void>;
  createProfile: (payload: CreateProfilePayload) => Promise<MakerCheckerResponse | null>;
  updateProfile: (id: string | number, payload: UpdateProfilePayload) => Promise<MakerCheckerResponse | null>;
  deleteProfile: (id: string | number, payload?: { remark?: string | null }) => Promise<MakerCheckerResponse | null>;
  activateProfile: (id: string | number) => Promise<MakerCheckerResponse | null>;
  deactivateProfile: (id: string | number) => Promise<MakerCheckerResponse | null>;
  getProfileAudit: (id: string | number) => Promise<AuditEntryOut[]>;
  setPermissions: (id: string | number, payload: SetPermissionsPayload) => Promise<boolean>;
  approveProfile: (request_id: string, payload?: CheckerDecisionRequest) => Promise<boolean>;
  rejectProfile: (request_id: string, payload?: CheckerDecisionRequest) => Promise<boolean>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [],
  pendingProfiles: [],
  isLoading: false,
  error: null,

  fetchProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await apiService.getProfiles();
      set({ profiles, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load profiles", isLoading: false });
    }
  },

  fetchPendingProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const pendingProfiles = await apiService.getPendingProfiles();
      set({ pendingProfiles, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load pending profiles", isLoading: false });
    }
  },

  createProfile: async (payload) => {
    set({ error: null });
    try {
      return await apiService.createProfile(payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create profile" });
      return null;
    }
  },

  updateProfile: async (id, payload) => {
    set({ error: null });
    try {
      return await apiService.updateProfile(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update profile" });
      return null;
    }
  },

  deleteProfile: async (id, payload) => {
    set({ error: null });
    try {
      return await apiService.deleteProfile(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete profile" });
      return null;
    }
  },

  activateProfile: async (id) => {
    set({ error: null });
    try {
      return await apiService.activateProfile(id);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to activate profile" });
      return null;
    }
  },

  deactivateProfile: async (id) => {
    set({ error: null });
    try {
      return await apiService.deactivateProfile(id);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to deactivate profile" });
      return null;
    }
  },

  getProfileAudit: async (id) => {
    try {
      return await apiService.getProfileAudit(id);
    } catch {
      return [];
    }
  },

  setPermissions: async (id, payload) => {
    set({ error: null });
    try {
      await apiService.setProfilePermissions(id, payload);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update permissions" });
      return false;
    }
  },

  approveProfile: async (request_id, payload) => {
    set({ error: null });
    try {
      await apiService.approveProfile(request_id, payload);
      set((state) => ({
        pendingProfiles: state.pendingProfiles.filter((r) => r.request_id !== request_id),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to approve profile" });
      return false;
    }
  },

  rejectProfile: async (request_id, payload) => {
    set({ error: null });
    try {
      await apiService.rejectProfile(request_id, payload);
      set((state) => ({
        pendingProfiles: state.pendingProfiles.filter((r) => r.request_id !== request_id),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to reject profile" });
      return false;
    }
  },
}));

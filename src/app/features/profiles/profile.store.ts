import { create } from "zustand";
import type { Profile, CreateProfilePayload } from "./profile.types";
import { apiService } from "../api.service";
import type { Permission } from "../api.service";

interface ProfileStore {
  profiles: Profile[];
  isLoading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
  createProfile: (payload: CreateProfilePayload) => Promise<Profile | null>;
  setPermissions: (id: string | number, permissions: Permission[]) => Promise<boolean>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [],
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

  createProfile: async (payload) => {
    set({ error: null });
    try {
      const created = await apiService.createProfile(payload);
      set((state) => ({ profiles: [...state.profiles, created] }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create profile" });
      return null;
    }
  },

  setPermissions: async (id, permissions) => {
    set({ error: null });
    try {
      await apiService.setProfilePermissions(id, permissions);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update permissions" });
      return false;
    }
  },
}));

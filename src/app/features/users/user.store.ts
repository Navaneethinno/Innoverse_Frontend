import { create } from "zustand";
import type { User, CreateUserPayload } from "./user.types";
import { apiService } from "../api.service";

interface UserStore {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<User | null>;
}

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await apiService.getUsers();
      set({ users, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load users", isLoading: false });
    }
  },

  createUser: async (payload) => {
    set({ error: null });
    try {
      const created = await apiService.createUser(payload);
      set((state) => ({ users: [...state.users, created] }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create user" });
      return null;
    }
  },
}));

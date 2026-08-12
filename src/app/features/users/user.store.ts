import { create } from "zustand";
import type { User, CreateUserPayload, UpdateUserPayload, RemarkPayload } from "./user.types";
import type { PendingRequestOut, AuditEntryOut, MakerCheckerResponse, CheckerDecisionRequest } from "../maker-checker.types";
import { apiService } from "../api.service";

interface UserStore {
  users: User[];
  pendingUsers: PendingRequestOut[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  fetchPendingUsers: () => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<MakerCheckerResponse | null>;
  updateUser: (id: string | number, payload: UpdateUserPayload) => Promise<MakerCheckerResponse | null>;
  deleteUser: (id: string | number, payload?: RemarkPayload) => Promise<MakerCheckerResponse | null>;
  activateUser: (id: string | number, payload?: RemarkPayload) => Promise<MakerCheckerResponse | null>;
  deactivateUser: (id: string | number, payload?: RemarkPayload) => Promise<MakerCheckerResponse | null>;
  getUserAudit: (id: string | number) => Promise<AuditEntryOut[]>;
  approveUser: (request_id: string, payload?: CheckerDecisionRequest) => Promise<boolean>;
  rejectUser: (request_id: string, payload?: CheckerDecisionRequest) => Promise<boolean>;
  continueRejectedAdd: (request_id: string, payload: { after_data?: Record<string, unknown>; remark?: string | null }, mode: "edit" | "delete") => Promise<MakerCheckerResponse | null>;
}

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  pendingUsers: [],
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

  fetchPendingUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const pendingUsers = await apiService.getPendingUsers();
      set({ pendingUsers, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load pending users", isLoading: false });
    }
  },

  createUser: async (payload) => {
    set({ error: null });
    try {
      return await apiService.createUser(payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create user" });
      return null;
    }
  },

  updateUser: async (id, payload) => {
    set({ error: null });
    try {
      return await apiService.updateUser(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update user" });
      return null;
    }
  },

  deleteUser: async (id, payload) => {
    set({ error: null });
    try {
      return await apiService.deleteUser(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete user" });
      return null;
    }
  },

  activateUser: async (id, payload) => {
    set({ error: null });
    try {
      return await apiService.activateUser(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to activate user" });
      return null;
    }
  },

  deactivateUser: async (id, payload) => {
    set({ error: null });
    try {
      return await apiService.deactivateUser(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to deactivate user" });
      return null;
    }
  },

  getUserAudit: async (id) => {
    try {
      return await apiService.getUserAudit(id);
    } catch {
      return [];
    }
  },

  approveUser: async (request_id, payload) => {
    set({ error: null });
    try {
      await apiService.approveUser(request_id, payload);
      set((state) => ({
        pendingUsers: state.pendingUsers.filter((r) => r.request_id !== request_id),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to approve user" });
      return false;
    }
  },

  rejectUser: async (request_id, payload) => {
    set({ error: null });
    try {
      await apiService.rejectUser(request_id, payload);
      set((state) => ({
        pendingUsers: state.pendingUsers.filter((r) => r.request_id !== request_id),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to reject user" });
      return false;
    }
  },

  continueRejectedAdd: async (request_id, payload, mode) => {
    set({ error: null });
    try {
      return await apiService.continueRejectedUserAdd(request_id, payload, mode);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to continue rejected user request" });
      return null;
    }
  },
}));

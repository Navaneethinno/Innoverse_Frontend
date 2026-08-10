import { create } from "zustand";
import type { PendingChange, ChangeStatus } from "./review.types";
import { reviewApi } from "./review.api";

interface ReviewStore {
  changes: PendingChange[];
  selectedChangeId: string;
  isLoading: boolean;
  error: string | null;
  fetchChanges: () => Promise<void>;
  fetchChangeById: (id: string) => Promise<PendingChange | null>;
  selectChange: (id: string) => void;
  updateChangeStatus: (id: string, status: ChangeStatus) => Promise<boolean>;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  changes: [],
  selectedChangeId: "",
  isLoading: false,
  error: null,
  fetchChanges: async () => {
    set({ isLoading: true, error: null });
    try {
      const changes = await reviewApi.list();
      set({ changes, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load approvals", isLoading: false });
    }
  },
  fetchChangeById: async (id) => {
    set({ selectedChangeId: id, error: null });
    try {
      const change = await reviewApi.getById(id);
      if (!change) {
        set({ error: "Approval not found" });
        return null;
      }
      return change;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load approval" });
      return null;
    }
  },
  selectChange: (id) => set({ selectedChangeId: id }),
  updateChangeStatus: async (id, status) => {
    set({ error: null });
    try {
      await reviewApi.updateStatus(id, status);
      set((state) => ({
        changes: state.changes.map((change) =>
          String(change.id) === String(id)
            ? { ...change, auth_status: status, status }
            : change
        ),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update approval" });
      return false;
    }
  },
}));

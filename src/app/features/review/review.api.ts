import { apiService } from "../../features/api.service";
import type { PendingChange } from "./review.types";

const delay = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));

const MOCK_CHANGES: PendingChange[] = [
  {
    id: "chg-101",
    institutionId: "inst-001",
    institutionName: "First National Bank",
    label: "Primary Email",
    field: "email",
    oldValue: "ops@firstnational.example",
    newValue: "platform@firstnational.example",
    requestedBy: "Sarah Chen",
    requestedAt: "2024-04-12",
    reason: "Update primary operations contact",
    status: "pending",
  },
  {
    id: "chg-102",
    institutionId: "inst-002",
    institutionName: "Pacific Savings & Trust",
    label: "Office Address",
    field: "address",
    oldValue: "240 Harbor Drive",
    newValue: "250 Harbor Drive",
    requestedBy: "Ava Patel",
    requestedAt: "2024-04-10",
    reason: "Building renumbering",
    status: "approved",
  },
];

export const reviewApi = {
  list: async () => {
    try {
      return await apiService.getReviews();
    } catch (e) {
      if (e instanceof TypeError) {
        await delay();
        return MOCK_CHANGES;
      }
      throw e;
    }
  },
  getById: async (id: string) => {
    const changes = await reviewApi.list();
    return changes.find((change) => String(change.id) === String(id)) ?? null;
  },
  updateStatus: async (id: string, status: PendingChange["status"]) => {
    try {
      return await apiService.updateReviewStatus(id, status);
    } catch (e) {
      if (e instanceof TypeError) {
        await delay();
        const item = MOCK_CHANGES.find((change) => change.id === id);
        return item ? { ...item, status } : null;
      }
      throw e;
    }
  },
};

import { apiService } from "../../features/api.service";
import type { Institution } from "./institution.types";

const delay = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));

const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: "inst-001",
    name: "First National Bank",
    type: "Commercial Bank",
    status: "active",
    email: "ops@firstnational.example",
    phone: "+1 (555) 100-2000",
    address: "100 Market Street",
    city: "New York",
    country: "United States",
    regNumber: "REG-10001",
    createdAt: "2024-01-15",
    maker: "Sarah Chen",
    checker: "Michael Torres",
    totalAccounts: 12843,
    totalVolume: "$4.8B",
    tags: ["Tier-1", "Regulated"],
  },
  {
    id: "inst-002",
    name: "Pacific Savings & Trust",
    type: "Trust Company",
    status: "pending",
    email: "hello@pacificsavings.example",
    phone: "+1 (555) 210-3000",
    address: "240 Harbor Drive",
    city: "San Francisco",
    country: "United States",
    regNumber: "REG-20002",
    createdAt: "2024-02-02",
    maker: "Ava Patel",
    totalAccounts: 3421,
    totalVolume: "$980M",
    tags: ["Pending Review"],
  },
];

export const institutionApi = {
  list: async () => {
    try {
      return await apiService.getInstitutions();
    } catch (e) {
      // Only fall back to mock data on network errors, not API errors
      if (e instanceof TypeError) {
        await delay();
        return MOCK_INSTITUTIONS;
      }
      throw e;
    }
  },
  getById: async (id: string) => {
    const institutions = await institutionApi.list();
    return institutions.find((institution) => String(institution.id) === String(id)) ?? null;
  },
  create: async (payload: Partial<Institution>) => {
    try {
      return await apiService.createInstitution(payload);
    } catch (e) {
      if (e instanceof TypeError) {
        await delay();
        return {
          id: `inst-${Date.now()}`,
          name: payload.name ?? "New Institution",
          type: payload.type ?? "Commercial Bank",
          status: "draft",
          email: payload.email ?? "",
          phone: payload.phone ?? "",
          address: payload.address ?? "",
          city: payload.city ?? "",
          country: payload.country ?? "United States",
          regNumber: payload.regNumber ?? "",
          createdAt: new Date().toDateString(),
          maker: "Platform Admin",
          totalAccounts: 0,
          totalVolume: "$0",
          tags: payload.tags ?? [],
        };
      }
      throw e;
    }
  },
};

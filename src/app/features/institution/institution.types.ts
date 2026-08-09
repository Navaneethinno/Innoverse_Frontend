export type InstStatus = "active" | "pending" | "rejected" | "suspended" | "draft";

export interface Institution {
  id: string;
  name: string;
  type: string;
  status: InstStatus;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  regNumber: string;
  createdAt: string;
  maker: string;
  checker?: string;
  totalAccounts: number;
  totalVolume: string;
}


import { api } from "@/lib/api";
import type { Dashboard } from "./types";

export const dashboardApi = {
  get: () => api<Dashboard>("/api/dashboard"),
};

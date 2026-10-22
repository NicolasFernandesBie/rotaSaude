"use client";

import { useApi } from "@/lib/useApi";
import { dashboardApi } from "../api";

export function useDashboard() {
  return useApi<import("../types").Dashboard>("/api/dashboard");
}

export { dashboardApi };

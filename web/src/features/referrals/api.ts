import { api } from "@/lib/api";
import type { Referral } from "./types";

export const referralsApi = {
  list: (query = "") => api<Referral[]>(`/api/referrals${query}`),

  get: (id: string) => api<Referral>(`/api/referrals/${id}`),

  autoAssign: (id: string) =>
    api<{ trip: { destinationCity: string; departureAt: string } }>(
      `/api/referrals/${id}/auto-assign`,
      { method: "POST", body: {} },
    ),

  assign: (id: string, tripId: string) =>
    api(`/api/referrals/${id}/assign`, { method: "POST", body: { tripId } }),

  unassign: (id: string) =>
    api(`/api/referrals/${id}/unassign`, { method: "POST", body: {} }),
};

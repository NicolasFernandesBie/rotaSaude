import { api } from "@/lib/api";
import type { Suggestion, TripSuggestions } from "@/features/referrals/types";
import type { Trip } from "./types";

export const tripsApi = {
  list: () => api<Trip[]>("/api/trips"),

  get: (tripId: string) => api<Trip>(`/api/trips/${tripId}`),

  create: (body: Record<string, unknown>) =>
    api<Trip>("/api/trips", { method: "POST", body }),

  update: (tripId: string, body: Record<string, unknown>) =>
    api<Trip>(`/api/trips/${tripId}`, { method: "PATCH", body }),

  suggestions: (tripId: string) => api<TripSuggestions>(`/api/trips/${tripId}/suggestions`),

  autoFill: (tripId: string) =>
    api<{ assigned: unknown[] }>(`/api/trips/${tripId}/auto-fill`, { method: "POST", body: {} }),

  changeStatus: (tripId: string, status: string, returnAt?: string) =>
    api<Trip>(`/api/trips/${tripId}/status`, {
      method: "POST",
      body: returnAt ? { status, returnAt } : { status },
    }),

  markSeat: (tripId: string, seatId: string, status: string) =>
    api(`/api/trips/${tripId}/seats/${seatId}`, { method: "PATCH", body: { status } }),
};

export type { Suggestion };

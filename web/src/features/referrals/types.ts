import type { Patient } from "@/features/patients/types";
import type { Notification } from "@/features/notifications/types";
import type { Seat } from "@/features/trips/types";

export type ReferralKind = "CONSULTA" | "EXAME" | "TRATAMENTO";

export type Referral = {
  id: string;
  patientId: string;
  kind: string;
  specialty: string | null;
  destinationCity: string;
  destinationUnit: string;
  requestedBy: string | null;
  requestedAt: string;
  preferredDate: string | null;
  urgency: string;
  status: string;
  queueSince: string;
  notes: string | null;
  score?: number;
  patient?: Patient;
  seat?: Seat | null;
  notifications?: Notification[];
};

export type Suggestion = Referral & {
  priority: number;
  suggestionScore: number;
  sameCity: boolean;
  reasons: string[];
};

export type TripSuggestions = {
  tripId: string;
  status: string;
  destinationCity: string;
  departureAt: string;
  freeSeats: number;
  suggestions: Suggestion[];
};

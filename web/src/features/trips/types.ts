import type { Referral } from "@/features/referrals/types";

export type TripPhase =
  | "IDA_AGENDADA"
  | "IDA_EM_ROTA"
  | "IDA_CONCLUIDA"
  | "VOLTA_EM_ROTA"
  | "CONCLUIDA";

export type TripLeg = "IDA" | "VOLTA";

export type Seat = {
  id: string;
  tripId: string;
  referralId: string;
  number: number;
  status: string;
  trip?: Trip;
  referral?: Referral;
};

export type Trip = {
  id: string;
  departureAt: string;
  originCity: string;
  destinationCity: string;
  vehicle: string;
  driver: string;
  phone: string | null;
  capacity: number;
  status: string;
  phase: string;
  returnAt: string | null;
  notes: string | null;
  seats?: Seat[];
  events?: TripEvent[];
  usedSeats?: number;
  freeSeats?: number;
  suggestedCount?: number;
};

export type TripEvent = {
  id: string;
  tripId: string;
  phase: string;
  originCity: string;
  destinationCity: string;
  departureAt: string | null;
  passengerCount: number;
  notes: string | null;
  createdAt: string;
};

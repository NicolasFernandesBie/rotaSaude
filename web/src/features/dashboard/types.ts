import type { Notification } from "@/features/notifications/types";
import type { Referral } from "@/features/referrals/types";
import type { Seat, Trip } from "@/features/trips/types";

export type Dashboard = {
  counts: {
    aguardando: number;
    confirmado: number;
    emViagem: number;
    atendido: number;
    faltou: number;
    cancelado: number;
  };
  absenteism: { atendidos30: number; faltas30: number; rate: number };
  tripsToday: number;
  nextTrip: (Trip & { seats: Seat[] }) | null;
  upcomingTrips: (Trip & { seats: Seat[] })[];
  queue: Referral[];
  recentNotifications: Notification[];
};

export type Patient = {
  id: string;
  name: string;
  cpf: string | null;
  susCard: string | null;
  phone: string;
  birthDate: string | null;
  city: string;
  address: string | null;
  healthPost: string;
  mobility: string;
  notes: string | null;
  createdAt: string;
  _count?: { referrals: number };
  referrals?: Referral[];
};

export type Seat = {
  id: string;
  tripId: string;
  referralId: string;
  number: number;
  status: string;
  trip?: Trip;
  referral?: Referral;
};

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
  tripKind: string;
  parentTripId: string | null;
  notes: string | null;
  seats?: Seat[];
  usedSeats?: number;
  freeSeats?: number;
  suggestedCount?: number;
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

export type Notification = {
  id: string;
  referralId: string | null;
  channel: string;
  kind: string;
  kindLabel?: string;
  to: string;
  patientName: string;
  message: string;
  status: string;
  scheduledFor: string;
  sentAt: string | null;
  error: string | null;
  externalId?: string | null;
  createdAt: string;
};

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

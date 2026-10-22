export type Mobility = "INDEPENDENTE" | "APOIO" | "CADEIRANTE";

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
  referrals?: import("@/features/referrals/types").Referral[];
};

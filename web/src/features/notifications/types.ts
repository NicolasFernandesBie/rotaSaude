export type NotificationChannel = "WHATSAPP" | "SMS";

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

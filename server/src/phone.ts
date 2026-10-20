export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 13;
}

export function toWhatsAppNumber(phone: string): string {
  let digits = normalizePhone(phone).replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

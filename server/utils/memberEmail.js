/** Deterministic placeholder when public signup has no email. */
export function placeholderEmailForPhone(normalizedPhone) {
  const digits = normalizedPhone.replace(/\D/g, "");
  return `${digits}@booking.local`;
}

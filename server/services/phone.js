export function normalizePhone(raw) {
  if (/^\+\d{10,15}$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  throw new Error(
    `Cannot normalize phone "${raw}". Provide a 10-digit US number, +1XXXXXXXXXX, or E.164 format.`
  );
}

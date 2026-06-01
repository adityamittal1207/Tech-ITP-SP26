/** SMS types where the member may self-cancel via magic link. */
export const BOOKING_CANCEL_TYPES = new Set(["reminder", "waitlistPromoted", "waitlistJoined"]);

const SELF_CANCEL_STATUSES = new Set(["booked", "confirmed", "waitlisted"]);

export function shouldIncludeCancelLink(type, bookingStatus) {
  if (!BOOKING_CANCEL_TYPES.has(type)) return false;
  return SELF_CANCEL_STATUSES.has(bookingStatus);
}

export function ensureCancelLinkPlaceholder(template, type) {
  if (!BOOKING_CANCEL_TYPES.has(type)) return template;
  const trimmed = template.trim();
  if (/\{cancelLink\}/.test(trimmed)) return trimmed;
  return `${trimmed} Cancel: {cancelLink}`;
}

export function buildSmsBody({ template, bodyOverride, mergeData, type }) {
  const source = bodyOverride ?? template;
  let body = source.replace(/\{(\w+)\}/g, (_, key) => mergeData[key] ?? `{${key}}`);

  if (
    shouldIncludeCancelLink(type, mergeData._bookingStatus) &&
    mergeData.cancelLink &&
    !body.includes(mergeData.cancelLink)
  ) {
    body = `${body.trim()} Cancel: ${mergeData.cancelLink}`;
  }

  return body;
}

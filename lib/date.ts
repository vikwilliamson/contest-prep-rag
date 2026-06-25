// Pure date helpers for the journal. Dates are represented as local
// `YYYY-MM-DD` keys — the same key used at users/{uid}/logs/{date}/ in
// Firestore. All parsing builds local Date objects (never UTC) so a key
// always means the same calendar day regardless of timezone.

const KEY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Today's date as a local YYYY-MM-DD key.
export function todayKey(): string {
  return toKey(new Date());
}

// A new key offset by `n` days (negative steps back). Handles month/year
// rollover via the Date constructor's normalization.
export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

// Human-readable form, e.g. "Tuesday, 23 June 2026".
export function formatDateKey(key: string): string {
  return KEY_FORMAT.format(fromKey(key));
}

export function isToday(key: string): boolean {
  return key === todayKey();
}

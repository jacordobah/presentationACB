export const MINUTE_MS = 60_000;

// Bogotá has no daylight saving time, so a fixed offset is exact.
const BOGOTA_OFFSET = "-05:00";

const bogotaDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function bogotaDate(instant = new Date()) {
  return bogotaDateFormat.format(instant);
}

export function atBogotaTime(date, time) {
  return new Date(`${date}T${time}:00${BOGOTA_OFFSET}`);
}

export function addDays(date, days) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function isWeekend(date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function addMinutes(instant, minutes) {
  return new Date(new Date(instant).getTime() + minutes * MINUTE_MS);
}

export function isDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

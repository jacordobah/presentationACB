const TIME_ZONE = "America/Bogota";

const timeFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const longDateFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDateFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const isoDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const relativeFormat = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

// Calendar dates (YYYY-MM-DD) are anchored at noon in Bogotá so formatting
// never shifts the day.
const atNoon = (date: string) => new Date(`${date}T12:00:00-05:00`);

export function todayInBogota() {
  return isoDateFormat.format(new Date());
}

export function addDays(date: string, days: number) {
  const result = atNoon(date);
  result.setUTCDate(result.getUTCDate() + days);
  return isoDateFormat.format(result);
}

export function formatTime(instant: string | number) {
  return timeFormat.format(new Date(instant));
}

export function formatLongDate(date: string) {
  const text = longDateFormat.format(atNoon(date));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(date: string) {
  return shortDateFormat.format(atNoon(date));
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Polling clocks can run a few seconds behind the server, so instants in the
// near future are shown as "now" rather than "in 2 seconds".
export function formatElapsed(instant: string, now: number) {
  const seconds = Math.min(
    0,
    Math.round((new Date(instant).getTime() - now) / 1000),
  );
  if (Math.abs(seconds) < 60) return relativeFormat.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, "minute");
  return relativeFormat.format(Math.round(minutes / 60), "hour");
}

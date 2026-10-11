function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const POSITION_INTERVAL_MS = positiveNumber(
  import.meta.env.VITE_POSITION_INTERVAL_MS,
  5000,
);
export const POLL_INTERVAL_MS = positiveNumber(
  import.meta.env.VITE_POLL_INTERVAL_MS,
  5000,
);
export const NOTIFICATION_POLL_MS = 15_000;
export const LIST_POLL_MS = 15_000;

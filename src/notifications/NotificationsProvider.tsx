import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { listArrivals } from "../api/arrivals";
import { listCodeReports } from "../api/codes";
import type { CodeReport, LateArrival } from "../api/types";
import { useSessionUser } from "../auth/AuthContext";
import { useToast, type ToastApi } from "../components/toast/ToastContext";
import { CODES, isEmergency, NOTIFIED_CODES } from "../lib/codes";
import { NOTIFICATION_POLL_MS } from "../lib/config";
import { todayInBogota } from "../lib/dates";
import { NotificationsContext, type BadgeKey } from "./NotificationsContext";

// How far back the arrivals query looks, so a device clock that runs ahead of
// the server does not hide new records. Already seen records are filtered out
// by id.
const ARRIVALS_LOOKBACK_MS = 10 * 60_000;
const MAX_INDIVIDUAL_TOASTS = 3;

interface Announcer {
  toast: ToastApi;
  open: (key: BadgeKey) => void;
}

function announceArrivals(arrivals: LateArrival[], { toast, open }: Announcer) {
  const action = { label: "Ver", onSelect: () => open("arrivals") };
  if (arrivals.length > MAX_INDIVIDUAL_TOASTS) {
    toast.show(`${arrivals.length} llegadas fuera de programación nuevas.`, {
      tone: "warning",
      action,
    });
    return;
  }
  for (const arrival of arrivals) {
    toast.show(
      `Llegada fuera de programación: ${arrival.guideName} en ${arrival.routeCode}, ${arrival.minutesLate} min tarde.`,
      { tone: "warning", action },
    );
  }
}

function announceReports(reports: CodeReport[], { toast, open }: Announcer) {
  const action = { label: "Ver", onSelect: () => open("reports") };
  if (reports.length > MAX_INDIVIDUAL_TOASTS) {
    const emergencies = reports.filter((report) => isEmergency(report.code));
    toast.show(`${reports.length} novedades nuevas.`, {
      tone: emergencies.length > 0 ? "emergency" : "info",
      action,
    });
    return;
  }
  for (const report of reports) {
    const who = `${report.userName ?? "Un guía"} en ${report.routeCode}`;
    toast.show(`${report.code} ${CODES[report.code].label}: ${who}.`, {
      tone: isEmergency(report.code) ? "emergency" : "info",
      action,
    });
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const toast = useToast();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const [badges, setBadges] = useState<Record<BadgeKey, number>>({
    reports: 0,
    arrivals: 0,
  });
  const basePath = user.role === "MANAGER" ? "/manager" : "/leader";

  useEffect(() => {
    navigateRef.current = navigate;
  });

  const clearBadge = useCallback((key: BadgeKey) => {
    setBadges((current) =>
      current[key] === 0 ? current : { ...current, [key]: 0 },
    );
  }, []);

  useEffect(() => {
    const since = new Date(Date.now() - ARRIVALS_LOOKBACK_MS).toISOString();
    const sectionPaths: Record<BadgeKey, string> = {
      reports: `${basePath}/reports`,
      arrivals: `${basePath}/arrivals`,
    };
    let seenArrivals: Set<number> | null = null;
    let seenReports: Set<string> | null = null;
    let cancelled = false;
    let timer: number | undefined;

    const announcer: Announcer = {
      toast,
      open: (key) => {
        clearBadge(key);
        navigateRef.current(sectionPaths[key]);
      },
    };

    const addBadge = (key: BadgeKey, count: number) => {
      // Someone already looking at the section does not need a badge for it.
      if (count === 0 || window.location.pathname.startsWith(sectionPaths[key]))
        return;
      setBadges((current) => ({ ...current, [key]: current[key] + count }));
    };

    const poll = async () => {
      if (document.hidden) return;
      const result = await Promise.all([
        listArrivals({ since }),
        listCodeReports({ date: todayInBogota() }),
      ]).catch(() => null);
      if (cancelled) return;
      if (result) {
        const [arrivals, reports] = result;
        const alerts = reports.filter((report) =>
          NOTIFIED_CODES.includes(report.code),
        );
        if (seenArrivals && seenReports) {
          const knownArrivals = seenArrivals;
          const knownReports = seenReports;
          const newArrivals = arrivals.filter(
            (arrival) => !knownArrivals.has(arrival.id),
          );
          const newReports = alerts.filter(
            (report) => !knownReports.has(report.id),
          );
          announceArrivals(newArrivals, announcer);
          announceReports(newReports, announcer);
          addBadge("arrivals", newArrivals.length);
          addBadge("reports", newReports.length);
        }
        seenArrivals = new Set(arrivals.map((arrival) => arrival.id));
        seenReports = new Set(alerts.map((report) => report.id));
      }
      timer = window.setTimeout(poll, NOTIFICATION_POLL_MS);
    };

    const resumeWhenVisible = () => {
      if (document.hidden) return;
      window.clearTimeout(timer);
      void poll();
    };

    void poll();
    document.addEventListener("visibilitychange", resumeWhenVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resumeWhenVisible);
    };
  }, [basePath, toast, clearBadge]);

  const value = useMemo(() => ({ badges, clearBadge }), [badges, clearBadge]);

  return <NotificationsContext value={value}>{children}</NotificationsContext>;
}

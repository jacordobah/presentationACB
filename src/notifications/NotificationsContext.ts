import { createContext, useContext } from "react";

export type BadgeKey = "reports" | "arrivals";

export interface NotificationsContextValue {
  badges: Record<BadgeKey, number>;
  clearBadge: (key: BadgeKey) => void;
}

const NO_NOTIFICATIONS: NotificationsContextValue = {
  badges: { reports: 0, arrivals: 0 },
  clearBadge: () => undefined,
};

export const NotificationsContext =
  createContext<NotificationsContextValue>(NO_NOTIFICATIONS);

export function useNotifications() {
  return useContext(NotificationsContext);
}

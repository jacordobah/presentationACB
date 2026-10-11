import { Suspense } from "react";
import { Outlet } from "react-router";
import type { Role } from "../../api/types";
import { LocationProvider } from "../../location/LocationProvider";
import { TripTracker } from "../../location/TripTracker";
import { NotificationsProvider } from "../../notifications/NotificationsProvider";
import { LoadingState } from "../States";
import { AppHeader } from "./AppHeader";
import { BottomNav, SideNav } from "./Navigation";
import { NAVIGATION } from "./navItems";
import "./AppLayout.css";

export function AppLayout({ role }: { role: Role }) {
  const items = NAVIGATION[role];
  const shell = (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <AppHeader />
      <SideNav items={items} />
      <main className="app-main" id="main" tabIndex={-1}>
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav items={items} />
    </div>
  );

  return (
    <LocationProvider>
      {role !== "MANAGER" && <TripTracker />}
      {role === "GUIDE" ? (
        shell
      ) : (
        <NotificationsProvider>{shell}</NotificationsProvider>
      )}
    </LocationProvider>
  );
}

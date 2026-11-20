import { Suspense } from "react";
import { Outlet } from "react-router";
import { LocationProvider } from "../../location/LocationProvider";
import { TrackingProvider } from "../../location/TrackingProvider";
import { LoadingState } from "../States";
import { AppHeader } from "./AppHeader";
import { BottomNav, SideNav } from "./Navigation";
import { NAVIGATION } from "./navItems";
import "./AppLayout.css";

export function AppLayout() {
  return (
    <LocationProvider>
      <TrackingProvider>
        <div className="app-shell">
          <a className="skip-link" href="#main">
            Saltar al contenido
          </a>
          <AppHeader />
          <SideNav items={NAVIGATION} />
          <main className="app-main" id="main" tabIndex={-1}>
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </main>
          <BottomNav items={NAVIGATION} />
        </div>
      </TrackingProvider>
    </LocationProvider>
  );
}

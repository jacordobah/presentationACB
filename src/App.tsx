import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { HomeRedirect, RequireGuide } from "./auth/RequireRole";
import { AppLayout } from "./components/layout/AppLayout";
import { LoadingState } from "./components/States";
import { ToastProvider } from "./components/toast/ToastProvider";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const TodayPage = lazy(() => import("./pages/guide/TodayPage"));
const StudentsPage = lazy(() => import("./pages/guide/StudentsPage"));
const AttendancePage = lazy(() => import("./pages/guide/AttendancePage"));
const TripOperationPage = lazy(
  () => import("./pages/shared/trip/TripOperationPage"),
);

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingState />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/guide"
                element={
                  <RequireGuide>
                    <AppLayout />
                  </RequireGuide>
                }
              >
                <Route index element={<TodayPage />} />
                <Route path="trips/:tripId" element={<TripOperationPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="attendance" element={<AttendancePage />} />
              </Route>

              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

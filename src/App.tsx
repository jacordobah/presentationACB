import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { HomeRedirect, RequireRole } from "./auth/RequireRole";
import { AppLayout } from "./components/layout/AppLayout";
import { LoadingState } from "./components/States";
import { ToastProvider } from "./components/toast/ToastProvider";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const TodayPage = lazy(() => import("./pages/guide/TodayPage"));
const StudentsPage = lazy(() => import("./pages/guide/StudentsPage"));
const StudentFormPage = lazy(() => import("./pages/guide/StudentFormPage"));
const RouteProposalsPage = lazy(
  () => import("./pages/guide/RouteProposalsPage"),
);
const NewRoutePage = lazy(() => import("./pages/guide/NewRoutePage"));
const RouteEditorPage = lazy(() => import("./pages/guide/RouteEditorPage"));
const AttendancePage = lazy(() => import("./pages/guide/AttendancePage"));
const TripOperationPage = lazy(
  () => import("./pages/shared/trip/TripOperationPage"),
);
const LiveMapPage = lazy(() => import("./pages/shared/LiveMapPage"));
const RoutesPage = lazy(() => import("./pages/shared/RoutesPage"));
const RouteDetailPage = lazy(() => import("./pages/shared/RouteDetailPage"));
const ReportsPage = lazy(() => import("./pages/shared/ReportsPage"));
const ArrivalsPage = lazy(() => import("./pages/shared/ArrivalsPage"));
const SchedulePage = lazy(() => import("./pages/leader/SchedulePage"));
const PendingPage = lazy(() => import("./pages/leader/PendingPage"));
const RequestsPage = lazy(() => import("./pages/manager/RequestsPage"));
const RequestDetailPage = lazy(
  () => import("./pages/manager/RequestDetailPage"),
);
const ManagementPage = lazy(() => import("./pages/manager/ManagementPage"));

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
                  <RequireRole role="GUIDE">
                    <AppLayout role="GUIDE" />
                  </RequireRole>
                }
              >
                <Route index element={<TodayPage />} />
                <Route path="trips/:tripId" element={<TripOperationPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="students/new" element={<StudentFormPage />} />
                <Route
                  path="students/:studentId"
                  element={<StudentFormPage />}
                />
                <Route path="routes" element={<RouteProposalsPage />} />
                <Route path="routes/new" element={<NewRoutePage />} />
                <Route path="routes/:code" element={<RouteEditorPage />} />
                <Route path="attendance" element={<AttendancePage />} />
              </Route>

              <Route
                path="/leader"
                element={
                  <RequireRole role="LEADER">
                    <AppLayout role="LEADER" />
                  </RequireRole>
                }
              >
                <Route path="live" element={<LiveMapPage />} />
                <Route path="routes" element={<RoutesPage />} />
                <Route path="routes/:code" element={<RouteDetailPage />} />
                <Route path="trips/:tripId" element={<TripOperationPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="arrivals" element={<ArrivalsPage />} />
                <Route path="pending" element={<PendingPage />} />
              </Route>

              <Route
                path="/manager"
                element={
                  <RequireRole role="MANAGER">
                    <AppLayout role="MANAGER" />
                  </RequireRole>
                }
              >
                <Route path="requests" element={<RequestsPage />} />
                <Route path="requests/:code" element={<RequestDetailPage />} />
                <Route path="live" element={<LiveMapPage />} />
                <Route path="routes" element={<RoutesPage />} />
                <Route path="routes/:code" element={<RouteDetailPage />} />
                <Route path="admin" element={<ManagementPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="arrivals" element={<ArrivalsPage />} />
              </Route>

              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

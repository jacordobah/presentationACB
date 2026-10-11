import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router";
import { listCodeReports } from "../../../api/codes";
import { listTripGeometries } from "../../../api/routeGeometry";
import { listStudents } from "../../../api/students";
import { listTrips } from "../../../api/trips";
import type { LatLng, Trip, TripGeometry } from "../../../api/types";
import { useSessionUser } from "../../../auth/AuthContext";
import { AsyncContent } from "../../../components/AsyncContent";
import { EmptyState } from "../../../components/States";
import { useResource } from "../../../hooks/useResource";
import { POLL_INTERVAL_MS } from "../../../lib/config";
import { todayInBogota } from "../../../lib/dates";
import { distanceMeters } from "../../../lib/geo";
import { clearActiveTrip, setActiveTrip } from "../../../location/activeTrip";
import { useDeviceLocation, type Fix } from "../../../location/LocationContext";
import { BeforeStart } from "./BeforeStart";
import { EnRoute } from "./EnRoute";
import { ReportSheet } from "./ReportSheet";
import { TripFinished } from "./TripFinished";
import { TripHeader } from "./TripHeader";
import { TripMap } from "./TripMap";
import {
  pointStatesFor,
  useTripProgress,
  type TripProgress,
} from "./tripProgress";
import "./TripOperation.css";

// Only builds with VITE_LOCATION_SIMULATOR=true include the simulator chunk.
const LocationSimulator =
  import.meta.env.VITE_LOCATION_SIMULATOR === "true"
    ? lazy(() => import("../../../simulator/LocationSimulator"))
    : null;

function nextTarget(
  trip: Trip,
  geometry: TripGeometry,
  progress: TripProgress,
  fix: Fix | null,
): { label: string; location: LatLng } {
  const { meetingPoints, destination } = geometry;
  if (trip.status === "SCHEDULED") {
    return {
      label: meetingPoints[0].code,
      location: meetingPoints[0].location,
    };
  }
  const upcoming = meetingPoints.find(
    (point) =>
      !progress.points[point.code]?.completedAt &&
      (!fix || distanceMeters(fix, point.location) > point.radiusM),
  );
  return upcoming
    ? { label: upcoming.code, location: upcoming.location }
    : { label: "destino", location: destination.location };
}

function TripOperation({
  trip,
  onTripChanged,
}: {
  trip: Trip;
  onTripChanged: () => void;
}) {
  const user = useSessionUser();
  const { fix, status: locationStatus } = useDeviceLocation();
  const progress = useTripProgress(trip.id);
  const [reporting, setReporting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollPanelToTop = useCallback(
    () => panelRef.current?.scrollTo({ top: 0 }),
    [],
  );
  const geometry = useResource(
    `geometry:${trip.routeCode}:${trip.tripCode}`,
    async () => {
      const [found] = await listTripGeometries({
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
      });
      return found ?? null;
    },
  );
  const students = useResource(`students:${trip.routeCode}`, async () =>
    (await listStudents(trip.routeCode)).filter((student) => student.active),
  );
  const codes = useResource(
    `codes:${trip.routeCode}:${trip.date}`,
    () => listCodeReports({ routeCode: trip.routeCode, date: trip.date }),
    { pollMs: trip.status === "SCHEDULED" ? POLL_INTERVAL_MS : undefined },
  );

  const canOperate =
    trip.executors.some((executor) => executor.userId === user.id) ||
    (user.role === "GUIDE" &&
      trip.guides.some((guide) => guide.guideId === user.id));
  const isGuide = user.role === "GUIDE";
  const backPath = isGuide
    ? "/guide"
    : `/leader/routes/${trip.routeCode}?tab=today`;

  // Any operator's device keeps sending positions while the trip runs, also
  // after a reload or when another guide pressed start.
  useEffect(() => {
    if (trip.status === "IN_PROGRESS" && canOperate) {
      setActiveTrip({
        tripId: trip.id,
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
        userId: user.id,
        date: trip.date,
      });
    } else if (trip.status === "FINISHED") {
      clearActiveTrip(trip.id);
    }
  }, [
    trip.status,
    trip.id,
    trip.routeCode,
    trip.tripCode,
    trip.date,
    canOperate,
    user.id,
  ]);

  if (trip.status === "FINISHED") {
    return (
      <div className="trip-page">
        <TripHeader trip={trip} backPath={backPath} />
        <TripFinished
          trip={trip}
          summary={progress.summary}
          backPath={backPath}
          backLabel={isGuide ? "Volver a Hoy" : "Volver a la ruta"}
        />
      </div>
    );
  }

  return (
    <div className="trip-page">
      <TripHeader
        trip={trip}
        backPath={backPath}
        onReport={canOperate ? () => setReporting(true) : undefined}
      />
      <AsyncContent resource={geometry} loadingLabel="Cargando el trazado…">
        {(tripGeometry) =>
          tripGeometry ? (
            <div className="trip-layout">
              <TripMap
                geometry={tripGeometry}
                fix={fix}
                pointStates={pointStatesFor(tripGeometry, progress)}
                overlay={
                  LocationSimulator &&
                  canOperate && (
                    <Suspense fallback={null}>
                      <LocationSimulator
                        geometry={tripGeometry}
                        target={nextTarget(trip, tripGeometry, progress, fix)}
                      />
                    </Suspense>
                  )
                }
              />
              <div className="trip-panel" ref={panelRef} key={trip.status}>
                {trip.status === "SCHEDULED" ? (
                  <AsyncContent
                    resource={codes}
                    loadingLabel="Cargando llegadas…"
                  >
                    {(reports) => (
                      <BeforeStart
                        trip={trip}
                        geometry={tripGeometry}
                        codes={reports}
                        progress={progress}
                        fix={fix}
                        locationStatus={locationStatus}
                        canOperate={canOperate}
                        onCodesChanged={codes.reload}
                        onStarted={onTripChanged}
                      />
                    )}
                  </AsyncContent>
                ) : (
                  <AsyncContent
                    resource={students}
                    loadingLabel="Cargando estudiantes…"
                  >
                    {(list) => (
                      <EnRoute
                        trip={trip}
                        geometry={tripGeometry}
                        students={list}
                        progress={progress}
                        fix={fix}
                        locationStatus={locationStatus}
                        canOperate={canOperate}
                        onFocusChange={scrollPanelToTop}
                        onFinished={onTripChanged}
                      />
                    )}
                  </AsyncContent>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Esta ruta no tiene trazado">
              Hace falta cargar el KMZ del recorrido {trip.tripCode} para
              operarlo.
            </EmptyState>
          )
        }
      </AsyncContent>
      {canOperate && (
        <ReportSheet
          open={reporting}
          onClose={() => setReporting(false)}
          trip={trip}
          fix={fix}
        />
      )}
    </div>
  );
}

export default function TripOperationPage() {
  const { tripId } = useParams();
  const user = useSessionUser();
  const today = todayInBogota();
  const trips = useResource(
    `trips:${today}`,
    () => listTrips({ date: today }),
    {
      pollMs: POLL_INTERVAL_MS,
    },
  );
  const trip = trips.data?.find((candidate) => candidate.id === Number(tripId));

  if (trip) return <TripOperation trip={trip} onTripChanged={trips.reload} />;

  return (
    <div className="page">
      <AsyncContent resource={trips} loadingLabel="Cargando el recorrido…">
        {() => (
          <EmptyState title="No encontramos este recorrido">
            <p>Solo puedes abrir recorridos programados para hoy.</p>
            <Link to={user.role === "GUIDE" ? "/guide" : "/leader/routes"}>
              Volver
            </Link>
          </EmptyState>
        )}
      </AsyncContent>
    </div>
  );
}

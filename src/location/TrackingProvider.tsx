import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../api/http";
import { listTripGeometries } from "../api/routeGeometry";
import {
  createTrackingSession,
  getTrackingSession,
  sendTrackingObservation,
} from "../api/tracking";
import { useSessionUser } from "../auth/AuthContext";
import { useWakeLock } from "../hooks/useWakeLock";
import {
  GPS_POLICY_ID,
  GPS_TRACKING_ENABLED,
  TRACKING_INTERVAL_MS,
} from "../lib/config";
import { useActiveTrip, type ActiveTrip } from "./activeTrip";
import { useDeviceLocation } from "./LocationContext";
import {
  IDLE_TRACKING,
  TrackingContext,
  type TrackingStatus,
  type TrackingView,
} from "../tracking/TrackingContext";
import {
  getTrackingIdempotencyKey,
  readTracking,
  saveTracking,
  saveTrackingHandle,
} from "../tracking/trackingStore";

function ActiveTripTracking({
  trip,
  onChange,
}: {
  trip: ActiveTrip;
  onChange: (view: TrackingView) => void;
}) {
  const { fix } = useDeviceLocation(GPS_TRACKING_ENABLED);
  const fixRef = useRef(fix);

  useEffect(() => {
    fixRef.current = fix;
  }, [fix]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let sending = false;
    let blocked = false;
    let record = readTracking(trip.tripId);
    let geoRouteId = trip.geoRouteId ?? null;

    const publish = (status: TrackingStatus, message: string | null = null) => {
      if (cancelled) return;
      onChange({
        status,
        message,
        lastSentAt: record?.lastSentAt ?? null,
        trackingId: record?.trackingId ?? null,
      });
    };

    if (!GPS_TRACKING_ENABLED) {
      publish("disabled", "El seguimiento GPS no está habilitado.");
      return;
    }
    const policyId = GPS_POLICY_ID;
    if (!policyId) {
      publish(
        "error",
        "Falta configurar VITE_GPS_POLICY_ID para el seguimiento GPS.",
      );
      return;
    }
    const trackingPolicyId: string = policyId;

    async function resolveGeoRouteId() {
      if (geoRouteId) return geoRouteId;
      const [geometry] = await listTripGeometries({
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
      });
      geoRouteId = geometry?.geoRouteId ?? null;
      return geoRouteId;
    }

    async function ensureSession() {
      if (record?.credential) return true;
      if (blocked) return false;
      publish("starting", "Creando la sesión de seguimiento…");
      try {
        const routeId = await resolveGeoRouteId();
        if (!routeId) {
          blocked = true;
          publish(
            "error",
            "Esta ruta no tiene trazado; el recorrido sigue sin GPS.",
          );
          return false;
        }
        const response = await createTrackingSession(
          {
            trip_id: String(trip.tripId),
            guide_id: String(trip.userId),
            geo_route_id: routeId,
            policy_id: trackingPolicyId,
          },
          getTrackingIdempotencyKey(trip.tripId),
        );
        if (!response.observation_credential) {
          blocked = true;
          publish(
            "error",
            response.credential_status === "reissue_required"
              ? "La credencial de GPS expiró. El recorrido sigue sin seguimiento."
              : "El GPS no entregó una credencial para esta sesión.",
          );
          return false;
        }
        record = {
          tripId: trip.tripId,
          trackingId: response.tracking_id,
          credential: response.observation_credential,
          nextSequence: Math.max(1, (response.session.last_sequence ?? 0) + 1),
          startedAt: Date.now(),
          lastSentAt: null,
        };
        saveTracking(record);
        saveTrackingHandle({
          tripId: record.tripId,
          trackingId: record.trackingId,
        });
        publish("active");
        return true;
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 422) {
            blocked = true;
            publish(
              "error",
              "Esta ruta no está habilitada para seguimiento GPS. El recorrido continúa.",
            );
            return false;
          }
          if (error.status === 401 || error.status === 403) {
            blocked = true;
            publish(
              "error",
              "No hay autorización para el seguimiento GPS. El recorrido continúa.",
            );
            return false;
          }
          if ([400, 404, 409, 410, 413, 415].includes(error.status)) {
            blocked = true;
            publish(
              "error",
              "El GPS rechazó la configuración de la sesión. El recorrido continúa sin seguimiento.",
            );
            return false;
          }
        }
        publish("retrying", "No se pudo crear la sesión GPS. Reintentando…");
        return false;
      }
    }

    async function send() {
      if (cancelled || blocked || !record || sending) return;
      if (document.visibilityState !== "visible") {
        publish(
          "paused",
          "Seguimiento pausado mientras la app está en segundo plano.",
        );
        return;
      }
      const current = fixRef.current;
      if (!current) {
        publish("active", "Esperando señal de ubicación…");
        return;
      }
      if (current.simulated) {
        publish("paused", "La ubicación simulada no se envía al GPS.");
        return;
      }

      sending = true;
      try {
        await sendTrackingObservation(
          record.trackingId,
          {
            sequence: record.nextSequence,
            latitude: current.lat,
            longitude: current.lng,
            ...(current.accuracy !== null
              ? { accuracy_m: current.accuracy }
              : {}),
            captured_at: new Date(current.timestamp).toISOString(),
          },
          record.credential,
        );
        record = {
          ...record,
          nextSequence: record.nextSequence + 1,
          lastSentAt: Date.now(),
        };
        saveTracking(record);
        publish("active");
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409) {
            try {
              const session = await getTrackingSession(record.trackingId);
              record = {
                ...record,
                nextSequence: Math.max(
                  1,
                  (session.session.last_sequence ?? 0) + 1,
                ),
              };
              saveTracking(record);
              publish("retrying", "Sincronizando la secuencia del GPS…");
            } catch (syncError) {
              if (
                syncError instanceof ApiError &&
                (syncError.status === 404 || syncError.status === 410)
              ) {
                blocked = true;
                publish(
                  "error",
                  "La sesión GPS ya no existe. El recorrido continúa sin seguimiento.",
                );
              } else {
                publish("retrying", "No se pudo sincronizar la sesión GPS.");
              }
            }
          } else if (error.status === 401 || error.status === 403) {
            blocked = true;
            publish(
              "error",
              "La sesión GPS venció. El recorrido continúa sin seguimiento.",
            );
          } else if (error.status === 404 || error.status === 410) {
            blocked = true;
            publish(
              "error",
              "La sesión GPS ya no existe. El recorrido continúa sin seguimiento.",
            );
          } else if (error.status === 400) {
            record = {
              ...record,
              nextSequence: record.nextSequence + 1,
            };
            saveTracking(record);
            publish(
              "retrying",
              "El GPS rechazó una posición; se continúa con la siguiente.",
            );
          } else {
            publish(
              "retrying",
              "No se pudo enviar la ubicación. Reintentando…",
            );
          }
        } else {
          publish("retrying", "Sin conexión con el GPS. Reintentando…");
        }
      } finally {
        sending = false;
      }
    }

    async function tick() {
      if (cancelled || blocked || sending) return;
      if (document.visibilityState !== "visible") {
        publish(
          "paused",
          "Seguimiento pausado mientras la app está en segundo plano.",
        );
        return;
      }
      if (!(await ensureSession())) return;
      await send();
    }

    void (async () => {
      await ensureSession();
      if (!cancelled) {
        void tick();
        timer = window.setInterval(() => void tick(), TRACKING_INTERVAL_MS);
      }
    })();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        publish(
          record ? "active" : "starting",
          record ? null : "Conectando GPS…",
        );
        void tick();
      } else if (record) {
        publish(
          "paused",
          "Seguimiento pausado mientras la app está en segundo plano.",
        );
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    onChange,
    trip.geoRouteId,
    trip.routeCode,
    trip.tripCode,
    trip.tripId,
    trip.userId,
  ]);

  return null;
}

export function TrackingProvider({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const trip = useActiveTrip(user.id);
  const [view, setView] = useState<TrackingView>(IDLE_TRACKING);

  useWakeLock(trip !== null);

  return (
    <TrackingContext value={trip ? view : IDLE_TRACKING}>
      {trip && GPS_TRACKING_ENABLED && (
        <ActiveTripTracking
          key={`${trip.tripId}:${trip.userId}`}
          trip={trip}
          onChange={setView}
        />
      )}
      {children}
    </TrackingContext>
  );
}

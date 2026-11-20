import { request } from "./http";

export interface TrackingSessionInput {
  trip_id: string;
  guide_id: string;
  geo_route_id: string;
  policy_id: string;
}

export interface TrackingSessionResponse {
  tracking_id: string;
  session: {
    id: string;
    state: string;
    last_sequence?: number;
  };
  observation_credential: string;
  credential_status: string;
}

export interface TrackingObservationInput {
  sequence: number;
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  captured_at: string;
}

export interface TrackingObservationResponse {
  tracking_id: string;
  sequence: number;
  acceptance: string;
  received_at: string;
}

// The gateway replaces the browser Bearer with its internal GPS credential for
// session control and read operations.
export function createTrackingSession(
  input: TrackingSessionInput,
  idempotencyKey: string,
) {
  return request<TrackingSessionResponse>("geo", "tracking-sessions", {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": idempotencyKey },
    notifyUnauthorized: false,
  });
}

// Observations use the per-session credential, never the app session token.
export function sendTrackingObservation(
  trackingId: string,
  observation: TrackingObservationInput,
  credential: string,
) {
  return request<TrackingObservationResponse>(
    "geo",
    `tracking-sessions/${encodeURIComponent(trackingId)}/observations`,
    {
      method: "POST",
      body: observation,
      bearer: credential,
      authenticated: false,
    },
  );
}

export interface TrackingSessionStateResponse {
  session: {
    id: string;
    state: string;
    last_sequence?: number;
  };
}

export function getTrackingSession(trackingId: string) {
  return request<TrackingSessionStateResponse>(
    "geo",
    `tracking-sessions/${encodeURIComponent(trackingId)}`,
    { notifyUnauthorized: false },
  );
}

export function finishTrackingSession(trackingId: string) {
  return request<{ session: { id: string; state: string } }>(
    "geo",
    `tracking-sessions/${encodeURIComponent(trackingId)}/finish`,
    { method: "POST", notifyUnauthorized: false },
  );
}

# presentationACB

Guide-facing PWA for Al Colegio en Bici (ACB), the Bogotá program in which
public-school students ride to school along trusted routes escorted by guides.

This app is **only for guides**. It shows today's trips, the guide's assigned
routes, arrival/departure times, assigned students and a live map. Leader and
manager screens are no longer part of this app. Administrative work belongs in
`webadminACB`; some of the removed screens (route/school/staff management,
schedule, reports, arrivals and live map) are not ported there yet and remain
unavailable until that work lands.

Nginx serves the build and proxies `/api/admin` to adminACB and `/api/geo` to
geolocaACB. Both go through the API gateway, the only public entry point.

Route geometry comes from geolocaACB's `GET /routes` and `GET /meeting-points`.
The KMZ line name must start with the trip code (`541 Ruta hacia el colegio` or
`542 Ruta de regreso`) and the route code comes from its folder (`MM01 - COLEGIO`).
geolocaACB publishes both as `route_code` and `code`; each trip uses its latest
import with the meeting points of that import.

Administrative routes are identified by the numeric `routeId` in
`/api/admin/routes/{routeId}`. The `routeCode` is used for display and for the
geographic calls to `/api/geo`; the gateway translates the codes to the numeric
IDs that adminACB expects.

## Local test users

A fresh `adminACB` compose seeds:

- `cpardo` / `admin2026`: `MANAGER`, for `webadminACB`.
- `jbeltrano` / `guia2026`: `GUIDE`, for this app.

## Local demo data

After the stack is running, execute from the workspace root:

```powershell
.\Seed-Demo.ps1
```

It creates the `MM01` routes 541 and 542, assigns `jbeltrano`, assigns
`pepe preto` to PE01 of 541, and creates both trips for today. It is
re-runnable and uses the KMZ geometry already stored in MongoDB. Run it again
after a `docker compose down -v` / `Start Docker.bat`, which erases these rows.

## Run with Docker

The app and both backends share the `acb-net` network. Create it once:

```sh
docker network create acb-net
```

Start adminACB, the API gateway (`gatewayACB`), geolocaACB and the Go GPS
component from their repositories. Then, from this one:

```sh
cp .env.example .env
docker compose up -d --build
```

Open https://localhost:8443 (self-signed certificate) or http://localhost:8088.

With a public HTTPS URL for phones:

```sh
docker compose --profile tunnel up -d --build
docker compose logs tunnel
```

The URL is the `https://…trycloudflare.com` line in the logs.

## Run for development

Requires Node 22.22 or later (24 LTS recommended). With adminACB, geolocaACB and
the Go GPS running, from the repository root:

```sh
cp .env.example .env
npm install
npm run dev
```

The app runs on http://localhost:5173 and the dev server proxies the API to the
API gateway on port 5062, with the same rewrites as Nginx.

```sh
npm run lint
npm test
npm run build
npm run format
```

## Administration

The guide app no longer contains administrative screens. These capabilities
still need to be ported to `webadminACB` and are unavailable in the meantime:

- Create/edit administrative routes and schools.
- Assign guides to routes and manage the daily schedule.
- Create/deactivate students outside the trip flow.
- Reports, late arrivals and a live map for leaders and managers.

## GPS tracking

Tracking is enabled for the local test stack:

```sh
VITE_GPS_TRACKING_ENABLED=true
VITE_GPS_POLICY_ID=acb-local-v1
```

geolocaACB publishes `geometry_version` and `association_status=verified`;
gatewayACB validates the guide JWT and forces its own `GPS_POLICY_ID`. The GPS
control/read APIs are enabled in the local compose files.

When enabled, starting a trip creates a tracking session through
`POST /api/geo/tracking-sessions`. The app then sends observations every
`VITE_TRACKING_INTERVAL_MS` using the per-session credential. If tracking fails
(422, 401, network or missing credential), the trip still starts and the UI
warns that the route is running without GPS.

Both 541 (start at PE01) and 542 (start at the school) are supported. For 542
the school is added as the first stop, followed by the drop-off meeting points.

Tracking is foreground-only: the wake lock keeps the screen on, but a PWA cannot
reliably send positions while hidden or with the screen off. The credential is
kept in `sessionStorage`; closing the tab stops tracking.

The ETA is an estimate based on the remaining route distance and
`VITE_ESTIMATED_SPEED_KMH` (10 km/h by default). It is not an official schedule.

## Open it from an Android phone

- **Tunnel:** start the `tunnel` profile and open its URL in Chrome. The
  certificate is trusted, so location and installing the app both work.
- **Local network:** with the phone and the laptop on the same Wi-Fi, open
  `https://<laptop-LAN-IP>:8443` and accept the certificate warning. Location
  works, but installing the PWA needs the tunnel or a real certificate.

## Environment variables

| Variable                    | Default                   | Purpose                                           |
| --------------------------- | ------------------------- | ------------------------------------------------- |
| `HTTPS_PORT`                | `8443`                    | Host port for HTTPS.                              |
| `HTTP_PORT`                 | `8088`                    | Host port for HTTP, used by the tunnel.           |
| `VITE_LOCATION_SIMULATOR`   | `true` in Docker          | Includes the location simulator in the build.     |
| `VITE_POLL_INTERVAL_MS`     | `5000`                    | Refresh interval of the live data.                |
| `VITE_GPS_TRACKING_ENABLED` | `true` in local `.env`    | Enables GPS session creation and observations.    |
| `VITE_GPS_POLICY_ID`        | `acb-local-v1`            | Reference policy; gatewayACB is authoritative.    |
| `VITE_TRACKING_INTERVAL_MS` | `5000`                    | Observation cadence in milliseconds.              |
| `VITE_ESTIMATED_SPEED_KMH`  | `10`                      | Speed used for the displayed ETA estimate.        |
| `VITE_ADMIN_APP_URL`        | empty                     | Optional link to webadminACB on the login screen. |
| `ADMIN_API_URL`             | `http://api-gateway:5062` | Nginx upstream for `/api/admin`.                  |
| `GEO_API_URL`               | `http://api-gateway:5062` | Nginx upstream for `/api/geo`.                    |

Both `/api/admin` and `/api/geo` go through the API gateway. Nginx rewrites them
to `/api/v1/admin` and `/api/v1`, so the browser never talks to adminACB,
geolocaACB or the Go GPS directly.

`VITE_*` values are read at build time, so changing them needs `--build`. The
trip screen includes a location simulator to operate a trip away from the route;
simulated positions are never sent to GPS.

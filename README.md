# presentationACB

Web app of Al Colegio en Bici (ACB), the Bogotá program in which public-school students ride to
school along trusted routes escorted by guides. It is the only user interface of the system and
serves guides, zone leaders and the operations manager from Chrome on Android phones, installable
as a PWA, and from laptops.

Nginx serves the build and proxies `/api/admin` to adminACB and `/api/geo` to geolocaACB.

Route geometry comes from geolocaACB's `GET /routes` and `GET /meeting-points`. geolocaACB stores
no route or trip codes, so the line in each KMZ must be named after its trip: the route code and
then the trip code, as in `MM01 541 Ruta hacia el colegio` or `MM01-542`. Lines named otherwise
are ignored, and each trip uses its latest import with the meeting points of that import.

Administrative routes are identified by the numeric `routeId` in `/api/admin/routes/{routeId}`.
The `routeCode` is used for display and for the geographic calls to `/api/geo`; the gateway
translates the codes to the numeric IDs that adminACB expects.

## Run with Docker

The app and both backends share the `acb-net` network. Create it once:

```sh
docker network create acb-net
```

Start adminACB, the API gateway (`gatewayACB`), geolocaACB and the Go GPS component from their
repositories. The gateway joins `acb-net` as `api-gateway` and is the only entry point: it reaches
adminACB through the host, geolocaACB through the alias `geoloca-api`, and the Go GPS as
`geoloca-gps`. Then, from this one:

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

Requires Node 22.22 or later (24 LTS recommended). With adminACB, geolocaACB and the Go GPS
running, from the repository root:

```sh
cp .env.example .env
npm install
npm run dev
```

The app runs on http://localhost:5173 and the dev server proxies the API to the API gateway on
port 5062, with the same rewrites as Nginx. `npm run lint`, `npm run build` and `npm run format`
are also available.

## Open it from an Android phone

- **Tunnel:** start the `tunnel` profile and open its URL in Chrome. The certificate is trusted,
  so location and installing the app both work.
- **Local network:** with the phone and the laptop on the same Wi-Fi, open
  `https://<laptop-LAN-IP>:8443` and accept the certificate warning. Location works, but
  installing the PWA needs the tunnel or a real certificate.

## Environment variables

| Variable                  | Default                   | Purpose                                       |
| ------------------------- | ------------------------- | --------------------------------------------- |
| `HTTPS_PORT`              | `8443`                    | Host port for HTTPS.                          |
| `HTTP_PORT`               | `8088`                    | Host port for HTTP, used by the tunnel.       |
| `VITE_LOCATION_SIMULATOR` | `true` in Docker          | Includes the location simulator in the build. |
| `VITE_POLL_INTERVAL_MS`   | `5000`                    | Refresh interval of the live maps.            |
| `ADMIN_API_URL`           | `http://api-gateway:5062` | Nginx upstream for `/api/admin`.              |
| `GEO_API_URL`             | `http://api-gateway:5062` | Nginx upstream for `/api/geo`.                |

Both `/api/admin` and `/api/geo` go through the API gateway. Nginx rewrites them to
`/api/v1/admin` and `/api/v1`, so the browser never talks to adminACB, geolocaACB or the Go GPS
directly.

`VITE_*` values are read at build time, so changing them needs `--build`. The trip screen
includes a location simulator to operate a trip away from the route.

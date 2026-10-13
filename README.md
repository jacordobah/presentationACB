# presentationACB

Web app of Al Colegio en Bici (ACB), the Bogotá program in which public-school students ride to
school along trusted routes escorted by guides. It is the only user interface of the system and
serves guides, zone leaders and the operations manager from Chrome on Android phones, installable
as a PWA, and from laptops.

Nginx serves the build and proxies `/api/admin` to adminACB and `/api/geo` to geolocaACB.

Route geometry comes from geolocaACB's `GET /routes` and `GET /meeting-points`, filtered by
`route_code` and `trip_code`, which geolocaACB still has to store on each KMZ import. The app
uses the latest import of each trip.

## Run with Docker

The app and both backends share the `acb-net` network. Create it once:

```sh
docker network create acb-net
```

Start adminACB and geolocaACB from their repositories; they join `acb-net` with the aliases
`admin-api` and `geoloca-api`. Then, from this one:

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

Requires Node 22.22 or later (24 LTS recommended). With adminACB and geolocaACB running, from the
repository root:

```sh
cp .env.example .env
npm install
npm run dev
```

The app runs on http://localhost:5173 and the dev server proxies the API to the ports the backends
publish on the host, 8080 and 8000, like Nginx does. `npm run lint`, `npm run build` and
`npm run format` are also available.

## Open it from an Android phone

- **Tunnel:** start the `tunnel` profile and open its URL in Chrome. The certificate is trusted,
  so location, the camera and installing the app all work.
- **Local network:** with the phone and the laptop on the same Wi-Fi, open
  `https://<laptop-LAN-IP>:8443` and accept the certificate warning. Location and the camera
  work, but installing the PWA needs the tunnel or a real certificate.

## Environment variables

| Variable                    | Default                   | Purpose                                                  |
| --------------------------- | ------------------------- | -------------------------------------------------------- |
| `HTTPS_PORT`                | `8443`                    | Host port for HTTPS.                                     |
| `HTTP_PORT`                 | `8088`                    | Host port for HTTP, used by the tunnel.                  |
| `VITE_LOCATION_SIMULATOR`   | `true` in Docker          | Includes the location simulator in the build.            |
| `VITE_POSITION_INTERVAL_MS` | `5000`                    | How often a device on an active trip sends its position. |
| `VITE_POLL_INTERVAL_MS`     | `5000`                    | Refresh interval of the live maps.                       |
| `ADMIN_API_URL`             | `http://admin-api:8080`   | Nginx upstream for `/api/admin`.                         |
| `GEO_API_URL`               | `http://geoloca-api:8000` | Nginx upstream for `/api/geo`.                           |

`VITE_*` values are read at build time, so changing them needs `--build`. The trip screen
includes a location simulator to operate a trip away from the route.

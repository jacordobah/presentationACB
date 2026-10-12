# presentationACB

Web app of Al Colegio en Bici (ACB), the Bogotá program in which public-school students ride to
school along trusted routes escorted by guides. It is the only user interface of the system and
serves guides, zone leaders and the operations manager from Chrome on Android phones, installable
as a PWA, and from laptops.

Nginx serves the build and proxies `/api/admin` to adminACB and `/api/geo` to geolocaACB. Until
those backends are ready, `mock-api/` implements their contract in memory.

Route geometry comes from geolocaACB's `GET /routes` and `GET /meeting-points`, filtered by
`route_code` and `trip_code`, which geolocaACB still has to store on each KMZ import. The app
uses the latest import of each trip.

## Run with Docker

Standalone demo, with the app and the mock API:

```sh
cp .env.example .env
docker compose up -d --build
```

Open https://localhost:8443 (self-signed certificate) or http://localhost:8088.

The mock API keeps everything in memory and builds today's schedule relative to the moment it
starts. Restart it to reset the demo data with `docker compose restart mock-api`; session tokens
are signed JWTs, so users stay logged in.

With a public HTTPS URL for phones:

```sh
docker compose --profile tunnel up -d --build
docker compose logs tunnel
```

The URL is the `https://…trycloudflare.com` line in the logs.

Against the real backends, once adminACB and geolocaACB join the `acb-net` network with the
aliases `admin-api` and `geoloca-api`:

```sh
docker network create acb-net
docker compose -f docker-compose.yml -f docker-compose.integration.yml up -d --build web
```

## Run locally without Docker

Requires Node 22.22 or later (24 LTS recommended).

```sh
cd mock-api && npm install && npm start
```

In another terminal, from the repository root:

```sh
cp .env.example .env
npm install
npm run dev
```

The app runs on http://localhost:5173 and the dev server proxies the API to the mock like Nginx
does. `npm run lint`, `npm run build` and `npm run format` are also available.

## Open it from an Android phone

- **Tunnel:** start the `tunnel` profile and open its URL in Chrome. The certificate is trusted,
  so location, the camera and installing the app all work.
- **Local network:** with the phone and the laptop on the same Wi-Fi, open
  `https://<laptop-LAN-IP>:8443` and accept the certificate warning. Location and the camera
  work, but installing the PWA needs the tunnel or a real certificate.

## Environment variables

| Variable                    | Default                | Purpose                                                  |
| --------------------------- | ---------------------- | -------------------------------------------------------- |
| `HTTPS_PORT`                | `8443`                 | Host port for HTTPS.                                     |
| `HTTP_PORT`                 | `8088`                 | Host port for HTTP, used by the tunnel.                  |
| `VITE_LOCATION_SIMULATOR`   | `true` in Docker       | Includes the location simulator in the build.            |
| `VITE_POSITION_INTERVAL_MS` | `5000`                 | How often a device on an active trip sends its position. |
| `VITE_POLL_INTERVAL_MS`     | `5000`                 | Refresh interval of the live maps.                       |
| `ADMIN_API_URL`             | `http://mock-api:4001` | Nginx upstream for `/api/admin`.                         |
| `GEO_API_URL`               | `http://mock-api:4002` | Nginx upstream for `/api/geo`.                           |
| `ACB_JWT_SECRET`            | adminACB's dev secret  | Secret the mock API signs session tokens with.           |

`VITE_*` values are read at build time, so changing them needs `--build`. In integration mode
the upstreams default to `http://admin-api:8080` and `http://geoloca-api:8000`.

## Demo users

All passwords are `acb2026`.

| User             | Role                           | In the demo                                                       |
| ---------------- | ------------------------------ | ----------------------------------------------------------------- |
| `guia1`          | Guide, primary on MM01         | Runs MM01 541, which starts 30 minutes after the mock API starts. |
| `guia2`          | Guide, support on MM01         | Simulated: reports 523 at MM01's PE01 two minutes after startup.  |
| `guia3`          | Guide, MM02                    | MM02 541 runs as a simulated caravan.                             |
| `guia4`, `guia5` | Guides, KE01                   | KE01 541 runs as a simulated caravan.                             |
| `lider1`         | Zone leader, Los Mártires (MM) |                                                                   |
| `lider2`         | Zone leader, Kennedy (KE)      |                                                                   |
| `gerente1`       | Operations manager             | MM03 is waiting for review in Solicitudes.                        |

The trip screen includes a location simulator to run the demo away from the route.
`mock-api/samples` has KMZ files for the route proposal flow; `MM04-541-too-long.kmz` exceeds
the 5.5 km limit on purpose.

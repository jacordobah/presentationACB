import { createAdminApp } from "./admin.js";
import { createGeoApp } from "./geo.js";
import { seed } from "./seed.js";
import { startSimulation } from "./simulation.js";
import { Store } from "./store.js";

const ADMIN_PORT = 4001;
const GEO_PORT = 4002;

const startedAt = new Date();
const store = new Store();
seed(store, startedAt);
startSimulation(store, startedAt);

createAdminApp(store).listen(ADMIN_PORT, () => {
  console.log(`Admin API listening on port ${ADMIN_PORT}`);
});
createGeoApp(store).listen(GEO_PORT, () => {
  console.log(`Geo API listening on port ${GEO_PORT}`);
});

// Node does not exit on SIGTERM by default when it runs as PID 1 inside a
// container.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => process.exit(0));
}

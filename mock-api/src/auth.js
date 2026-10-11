import { forbidden, unauthorized } from "./http.js";
import { zoneOf } from "./store.js";

export function authenticate(store) {
  return (req, res, next) => {
    const [scheme, token] = (req.get("authorization") ?? "").split(" ");
    const user =
      scheme === "Bearer" && token ? store.sessionUser(token) : undefined;
    if (!user)
      throw unauthorized("Tu sesión no es válida o expiró. Ingresa de nuevo.");
    req.user = user;
    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

// Leaders and guides only ever see their own zone, whatever the query asks for.
export function scopedZone(user, requestedZone) {
  return user.role === "MANAGER" ? requestedZone || null : user.zone;
}

export function canAccessRoute(user, route) {
  switch (user.role) {
    case "MANAGER":
      return true;
    case "LEADER":
      return zoneOf(route.code) === user.zone;
    default:
      return (
        route.proposedById === user.id ||
        route.guides.some((g) => g.guideId === user.id)
      );
  }
}

export function canOperateTrip(store, user, trip) {
  return (
    trip.executorIds.includes(user.id) ||
    (user.role === "GUIDE" && store.isAssignedGuide(user.id, trip.routeCode))
  );
}

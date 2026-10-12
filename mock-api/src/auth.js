import { createHmac, timingSafeEqual } from "node:crypto";
import { forbidden } from "./http.js";
import { zoneOf } from "./store.js";

const JWT_SECRET =
  process.env.ACB_JWT_SECRET || "acb-dev-secret-change-me-0123456789abcdef";
const TOKEN_LIFETIME_S = 8 * 60 * 60;

const encodePart = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const decodePart = (part) =>
  JSON.parse(Buffer.from(part, "base64url").toString());
const sign = (data) =>
  createHmac("sha256", JWT_SECRET).update(data).digest("base64url");

// Mirrors the token adminACB issues.
export function issueToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const data = `${encodePart({ alg: "HS256" })}.${encodePart({
    sub: String(user.id),
    name: user.name,
    role: user.role,
    zone: user.zone,
    iat: issuedAt,
    exp: issuedAt + TOKEN_LIFETIME_S,
  })}`;
  return `${data}.${sign(data)}`;
}

function verifiedClaims(token) {
  const [header, payload, signature, ...rest] = token.split(".");
  if (signature === undefined || rest.length > 0) return null;
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const received = Buffer.from(signature);
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }
  if (decodePart(header).alg !== "HS256") return null;
  const claims = decodePart(payload);
  return claims.exp > Date.now() / 1000 ? claims : null;
}

// Tokens are stateless, so the active check is what blocks a deactivated user.
export function authenticate(store, reject) {
  return (req, res, next) => {
    const [scheme, token] = (req.get("authorization") ?? "").split(" ");
    const claims = scheme === "Bearer" && token ? verifiedClaims(token) : null;
    const user = claims && store.user(Number(claims.sub));
    if (!user?.active) {
      reject(res);
      return;
    }
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

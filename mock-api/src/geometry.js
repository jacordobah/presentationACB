const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function distanceMeters([lng1, lat1], [lng2, lat2]) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function lineLength(coordinates) {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += distanceMeters(coordinates[i - 1], coordinates[i]);
  }
  return total;
}

export function pointAlong(coordinates, distance) {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < coordinates.length; i++) {
    const from = coordinates[i - 1];
    const to = coordinates[i];
    const segment = distanceMeters(from, to);
    if (remaining <= segment) {
      const ratio = segment === 0 ? 0 : remaining / segment;
      return [
        from[0] + (to[0] - from[0]) * ratio,
        from[1] + (to[1] - from[1]) * ratio,
      ];
    }
    remaining -= segment;
  }
  return coordinates.at(-1);
}

// Distance along the line to the vertex nearest to each point. Points are
// matched in order so a line that passes the same corner twice still yields
// increasing distances.
export function stopDistances(coordinates, points) {
  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i++) {
    cumulative.push(
      cumulative[i - 1] + distanceMeters(coordinates[i - 1], coordinates[i]),
    );
  }
  let fromIndex = 0;
  return points.map((point) => {
    let bestIndex = fromIndex;
    let bestDistance = Infinity;
    for (let i = fromIndex; i < coordinates.length; i++) {
      const distance = distanceMeters(coordinates[i], point);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    fromIndex = bestIndex;
    return cumulative[bestIndex];
  });
}

export function formatKilometers(meters) {
  return `${(meters / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} km`;
}

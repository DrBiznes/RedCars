
// src/routing/utils/GeoUtils.ts

/**
 * Calculates the distance between two geographic coordinates in miles using the Haversine formula.
 * @param pos1 - The first position as [longitude, latitude].
 * @param pos2 - The second position as [longitude, latitude].
 * @returns The distance in miles.
 */
export function haversineDistance(
  pos1: [number, number],
  pos2: [number, number]
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(pos2[1] - pos1[1]);
  const dLon = toRadians(pos2[0] - pos1[0]);
  const lat1 = toRadians(pos1[1]);
  const lat2 = toRadians(pos2[1]);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Converts degrees to radians.
 * @param degrees - The angle in degrees.
 * @returns The angle in radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Finds the closest point on a line segment to a given point.
 * @param point - The point as [longitude, latitude].
 * @param start - The start point of the line segment as [longitude, latitude].
 * @param end - The end point of the line segment as [longitude, latitude].
 * @returns The closest point on the segment.
 */
export function findClosestPointOnSegment(
    point: [number, number], 
    start: [number, number], 
    end: [number, number]
  ): [number, number] {

    const [x, y] = point;
    const [x1, y1] = start;
    const [x2, y2] = end;
  
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
  
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) { // in case of start == end
      param = dot / lenSq;
    }
  
    let xx, yy;
  
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
  
    return [xx, yy];
  }

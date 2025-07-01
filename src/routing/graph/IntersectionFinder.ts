
// src/routing/graph/IntersectionFinder.ts

import { LineString } from 'geojson';
import { LineFeature } from '../types/routing.types';

/**
 * Finds all intersection points between a set of transit lines.
 * @param lines - An array of GeoJSON LineString features.
 * @returns A map where keys are stringified coordinates of intersections 
 *          and values are the names of the lines that intersect at that point.
 */
export function findIntersections(
  lines: LineFeature[]
): Map<string, string[]> {
  const intersections = new Map<string, string[]>();

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const line1 = lines[i];
      const line2 = lines[j];

      const line1Coords = line1.geometry.coordinates;
      const line2Coords = line2.geometry.coordinates;

      for (let k = 0; k < line1Coords.length - 1; k++) {
        for (let l = 0; l < line2Coords.length - 1; l++) {
          const p1 = line1Coords[k] as [number, number];
          const p2 = line1Coords[k + 1] as [number, number];
          const p3 = line2Coords[l] as [number, number];
          const p4 = line2Coords[l + 1] as [number, number];

          const intersectionPoint = getLineSegmentIntersection(p1, p2, p3, p4);

          if (intersectionPoint) {
            const key = JSON.stringify(intersectionPoint);
            if (!intersections.has(key)) {
              intersections.set(key, []);
            }
            const intersectingLines = intersections.get(key)!;
            if (!intersectingLines.includes(line1.properties.name)) {
              intersectingLines.push(line1.properties.name);
            }
            if (!intersectingLines.includes(line2.properties.name)) {
              intersectingLines.push(line2.properties.name);
            }
          }
        }
      }
    }
  }

  return intersections;
}

/**
 * Calculates the intersection point of two line segments, if it exists.
 * @param p1 - Start point of segment 1.
 * @param p2 - End point of segment 1.
 * @param p3 - Start point of segment 2.
 * @param p4 - End point of segment 2.
 * @returns The intersection point [lon, lat] or null if they don't intersect.
 */
function getLineSegmentIntersection(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number]
): [number, number] | null {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  const [x4, y4] = p4;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (denominator === 0) {
    return null; // Parallel or collinear
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const intersectX = x1 + t * (x2 - x1);
    const intersectY = y1 + t * (y2 - y1);
    return [intersectX, intersectY];
  }

  return null; // No intersection within the segments
}

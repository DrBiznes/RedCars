
// src/routing/utils/LineInterpolator.ts

import { LineString } from 'geojson';
import { haversineDistance } from './GeoUtils';

/**
 * Interpolates points at a specified distance interval along a LineString.
 * @param line - The GeoJSON LineString to interpolate along.
 * @param interval - The distance between interpolated points in miles.
 * @returns An array of interpolated points as [longitude, latitude].
 */
export function interpolatePointsAlongLine(
  line: LineString,
  interval: number
): [number, number][] {
  const points: [number, number][] = [];
  let distanceTraveled = 0;
  let segmentRemainder = 0;

  for (let i = 0; i < line.coordinates.length - 1; i++) {
    const start = line.coordinates[i] as [number, number];
    const end = line.coordinates[i + 1] as [number, number];
    const segmentLength = haversineDistance(start, end);

    let distanceIntoSegment = segmentRemainder;

    while (distanceIntoSegment < segmentLength) {
      const fraction = distanceIntoSegment / segmentLength;
      const newPoint: [number, number] = [
        start[0] + (end[0] - start[0]) * fraction,
        start[1] + (end[1] - start[1]) * fraction,
      ];
      points.push(newPoint);
      distanceTraveled += interval;
      distanceIntoSegment += interval;
    }

    segmentRemainder = distanceIntoSegment - segmentLength;
  }

  return points;
}


// src/routing/graph/StationGenerator.ts

import { FeatureCollection, Point, LineString } from 'geojson';
import { Station, StationFeature, LineFeature } from '../types/routing.types';
import { interpolatePointsAlongLine } from '../utils/LineInterpolator';
import { findIntersections } from './IntersectionFinder';
import { haversineDistance } from '../utils/GeoUtils';

const STATION_INTERVAL = 0.5; // miles

/**
 * Generates a complete list of stations from major stations, interpolated points, and intersections.
 * @param majorStationsFc - FeatureCollection of major stations (from stations.geojson).
 * @param linesFc - FeatureCollection of transit lines (from lines.geojson).
 * @returns An array of all Station objects.
 */
export function generateStations(
  majorStationsFc: FeatureCollection<Point, { name: string; line: string }>, 
  linesFc: FeatureCollection<LineString, { name: string }>
): Station[] {
  const lines = linesFc.features as LineFeature[];
  let allStations: Station[] = [];

  // 1. Add major stations from GeoJSON
  const majorStations = majorStationsFc.features.map((feature: StationFeature) => ({
    id: `station-${feature.properties.Name.replace(/\s+/g, '-')}`,
    name: feature.properties.Name,
    position: feature.geometry.coordinates as [number, number],
    lines: [feature.properties.line], // Initially, just the line from the file
    isIntersection: false,
    isMajor: true,
  }));
  allStations.push(...majorStations);

  // 2. Generate interpolated stations
  lines.forEach(line => {
    const interpolatedPoints = interpolatePointsAlongLine(line.geometry, STATION_INTERVAL);
    const interpolatedStations: Station[] = interpolatedPoints.map((point, index) => ({
      id: `station-${line.properties.Name.replace(/\s+/g, '-')}-gen-${index}`,
      name: `Generated Station ${index + 1} on ${line.properties.Name}`,
      position: point,
      lines: [line.properties.Name],
      isIntersection: false,
      isMajor: false,
    }));
    allStations.push(...interpolatedStations);
  });

  // 3. Find and create intersection stations
  const intersections = findIntersections(lines);
  intersections.forEach((intersectingLines, positionKey) => {
    const position = JSON.parse(positionKey) as [number, number];
    const id = `station-intersect-${position[0].toFixed(5)}-${position[1].toFixed(5)}`;
    const name = `Intersection of ${intersectingLines.join(', ')}`;
    allStations.push({
      id,
      name,
      position,
      lines: intersectingLines,
      isIntersection: true,
      isMajor: false,
    });
  });

  // 4. Refine major station line data
  // Ensure major stations know about all lines that pass through them
  allStations.forEach(station => {
    if (station.isMajor) {
      lines.forEach(line => {
        const lineName = line.properties.name;
        if (station.lines.includes(lineName)) return; // Already knows

        for (const coord of line.geometry.coordinates) {
          if (haversineDistance(station.position, coord as [number, number]) < 0.01) { // ~10 meters
            station.lines.push(lineName);
            break;
          }
        }
      });
    }
  });

  // 5. Deduplicate stations
  const stationMap = new Map<string, Station>();
  allStations.forEach(station => {
    // A simple ID-based deduplication is sufficient here
    if (!stationMap.has(station.id)) {
        stationMap.set(station.id, station);
    }
  });

  return Array.from(stationMap.values());
}

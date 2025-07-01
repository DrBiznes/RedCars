import { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { Station } from '../types/routing.types';
import { GeoUtils } from '../utils/GeoUtils';
import { LineIntersection } from './IntersectionFinder';

export class StationGenerator {
  private static STATION_SPACING_MILES = 0.5;
  private static MIN_STATION_DISTANCE = 0.1; // Don't place stations closer than this

  /**
   * Generate all stations from lines and historical stations
   */
  static generateStations(
    lines: Feature<LineString>[],
    historicalStations: FeatureCollection<Point> | null,
    intersections: LineIntersection[]
  ): Station[] {
    console.log('=== STATION GENERATION DEBUG ===');
    console.log('Input lines:', lines.length);
    console.log('Input historical stations:', historicalStations ? historicalStations.features.length : 0);
    console.log('Input intersections:', intersections.length);
    
    const stations: Station[] = [];
    
    // 1. Add historical stations first
    if (historicalStations) {
      const histStations = this.createHistoricalStations(historicalStations);
      console.log('Created historical stations:', histStations.length);
      stations.push(...histStations);
    } else {
      console.log('No historical stations provided');
    }

    // 2. Add intersection stations
    const intStations = this.createIntersectionStations(intersections);
    console.log('Created intersection stations:', intStations.length);
    stations.push(...intStations);

    // 3. Generate stations along lines every 0.5 miles
    console.log('Generating stations along lines...');
    for (const line of lines) {
      const lineName = line.properties?.Name || 'Unknown Line';
      console.log(`Processing line: ${lineName}`);
      const lineStations = this.generateLineStations(line, stations);
      console.log(`Generated ${lineStations.length} stations for ${lineName}`);
      stations.push(...lineStations);
    }

    // 4. Deduplicate nearby stations
    console.log('Total stations before deduplication:', stations.length);
    const dedupedStations = this.deduplicateStations(stations);
    console.log('Total stations after deduplication:', dedupedStations.length);
    console.log('=== STATION GENERATION COMPLETE ===');
    
    return dedupedStations;
  }

  /**
   * Create stations from historical station data
   */
  private static createHistoricalStations(
    stationData: FeatureCollection<Point>
  ): Station[] {
    return stationData.features.map((feature, index) => {
      const coords = feature.geometry.coordinates;
      const name = feature.properties?.Name || `Historical Station ${index + 1}`;
      
      return {
        id: `hist-${index}`,
        name,
        position: GeoUtils.coordToPosition(coords),
        lineNames: [], // Will be filled in later
        isIntersection: false,
        isHistorical: true
      };
    });
  }

  /**
   * Create stations at line intersections
   */
  private static createIntersectionStations(
    intersections: LineIntersection[]
  ): Station[] {
    return intersections.map((intersection, index) => ({
      id: `int-${index}`,
      name: `${intersection.line1Name} & ${intersection.line2Name}`,
      position: intersection.position,
      lineNames: [intersection.line1Name, intersection.line2Name],
      isIntersection: true,
      isHistorical: false
    }));
  }

  /**
   * Generate stations along a line every 0.5 miles
   */
  private static generateLineStations(
    line: Feature<LineString>,
    existingStations: Station[]
  ): Station[] {
    const stations: Station[] = [];
    const coords = line.geometry.coordinates;
    const lineName = line.properties?.Name || 'Unknown Line';
    
    console.log(`  - Line ${lineName} has ${coords.length} coordinate points`);
    
    // Calculate total line distance for reference
    let totalLineDistance = 0;
    for (let i = 1; i < coords.length; i++) {
      const segStart = GeoUtils.coordToPosition(coords[i - 1]);
      const segEnd = GeoUtils.coordToPosition(coords[i]);
      totalLineDistance += GeoUtils.getDistance(segStart, segEnd);
    }
    console.log(`  - Total line distance: ${totalLineDistance.toFixed(2)} miles`);
    console.log(`  - Expected stations: ~${Math.floor(totalLineDistance / this.STATION_SPACING_MILES)}`);
    
    let accumulatedDistance = 0;
    let stationCount = 0;

    for (let i = 1; i < coords.length; i++) {
      const segmentStart = GeoUtils.coordToPosition(coords[i - 1]);
      const segmentEnd = GeoUtils.coordToPosition(coords[i]);
      const segmentLength = GeoUtils.getDistance(segmentStart, segmentEnd);

      // Check if we need to place stations on this segment
      while (accumulatedDistance + segmentLength >= this.STATION_SPACING_MILES) {
        const remainingDistance = this.STATION_SPACING_MILES - accumulatedDistance;
        const ratio = remainingDistance / segmentLength;
        
        const stationPosition = GeoUtils.interpolatePosition(
          segmentStart,
          segmentEnd,
          ratio
        );

        // Only add if far enough from existing stations
        if (this.isFarFromExisting(stationPosition, existingStations) &&
            this.isFarFromExisting(stationPosition, stations)) {
          const newStation = {
            id: `gen-${lineName}-${stationCount}`,
            position: stationPosition,
            lineNames: [lineName],
            isIntersection: false,
            isHistorical: false
          };
          stations.push(newStation);
          console.log(`    + Generated station ${stationCount} at distance ${accumulatedDistance.toFixed(2)} miles`);
          stationCount++;
        } else {
          console.log(`    - Skipped station (too close to existing) at distance ${accumulatedDistance.toFixed(2)} miles`);
        }

        accumulatedDistance = accumulatedDistance + segmentLength - this.STATION_SPACING_MILES;
      }

      accumulatedDistance += segmentLength;
    }

    console.log(`  - Final count for ${lineName}: ${stations.length} stations`);
    return stations;
  }

  /**
   * Check if a position is far enough from existing stations
   */
  private static isFarFromExisting(
    position: Station['position'],
    existingStations: Station[]
  ): boolean {
    return existingStations.every(
      station => GeoUtils.getDistance(position, station.position) >= this.MIN_STATION_DISTANCE
    );
  }

  /**
   * Remove duplicate stations that are very close together
   */
  private static deduplicateStations(stations: Station[]): Station[] {
    const deduped: Station[] = [];

    for (const station of stations) {
      const existing = deduped.find(
        s => GeoUtils.getDistance(s.position, station.position) < this.MIN_STATION_DISTANCE
      );

      if (!existing) {
        deduped.push(station);
      } else {
        // Merge information if needed
        if (station.isHistorical && !existing.isHistorical) {
          // Replace with historical station
          const index = deduped.indexOf(existing);
          deduped[index] = station;
        } else if (station.lineNames.length > 0) {
          // Add line names
          existing.lineNames = [...new Set([...existing.lineNames, ...station.lineNames])];
          if (station.isIntersection) {
            existing.isIntersection = true;
          }
        }
      }
    }

    return deduped;
  }

  /**
   * Associate stations with lines they're close to
   */
  static associateStationsWithLines(
    stations: Station[],
    lines: Feature<LineString>[]
  ): void {
    const ASSOCIATION_DISTANCE = 0.05; // miles

    for (const station of stations) {
      if (station.lineNames.length === 0 || station.isHistorical) {
        // Find which lines this station is close to
        for (const line of lines) {
          const lineName = line.properties?.Name || 'Unknown Line';
          const coords = line.geometry.coordinates;

          for (let i = 0; i < coords.length - 1; i++) {
            const segmentStart = GeoUtils.coordToPosition(coords[i]);
            const segmentEnd = GeoUtils.coordToPosition(coords[i + 1]);
            
            const closestPoint = GeoUtils.closestPointOnLine(
              station.position,
              segmentStart,
              segmentEnd
            );

            const distance = GeoUtils.getDistance(station.position, closestPoint);

            if (distance < ASSOCIATION_DISTANCE && !station.lineNames.includes(lineName)) {
              station.lineNames.push(lineName);
            }
          }
        }
      }
    }
  }
}
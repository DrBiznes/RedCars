import { Feature, LineString } from 'geojson';
import { Position } from '../types/routing.types';
import { GeoUtils } from '../utils/GeoUtils';

export interface LineIntersection {
  position: Position;
  line1Name: string;
  line2Name: string;
  line1SegmentIndex: number;
  line2SegmentIndex: number;
}

export class IntersectionFinder {
  /**
   * Find all intersections between lines
   */
  static findAllIntersections(lines: Feature<LineString>[]): LineIntersection[] {
    const intersections: LineIntersection[] = [];
    const tolerance = 0.0001; // About 36 feet
    
    console.log('=== INTERSECTION FINDER DEBUG ===');
    console.log('Finding intersections between', lines.length, 'lines');

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const line1 = lines[i];
        const line2 = lines[j];
        
        const lineIntersections = this.findLineIntersections(line1, line2);
        intersections.push(...lineIntersections);
      }
    }

    // Deduplicate nearby intersections
    return this.deduplicateIntersections(intersections, tolerance);
  }

  /**
   * Find intersections between two lines
   */
  private static findLineIntersections(
    line1: Feature<LineString>,
    line2: Feature<LineString>
  ): LineIntersection[] {
    const intersections: LineIntersection[] = [];
    const coords1 = line1.geometry.coordinates;
    const coords2 = line2.geometry.coordinates;
    const line1Name = line1.properties?.Name || 'Unknown Line 1';
    const line2Name = line2.properties?.Name || 'Unknown Line 2';

    // Check each segment of line1 against each segment of line2
    for (let i = 0; i < coords1.length - 1; i++) {
      const p1 = GeoUtils.coordToPosition(coords1[i]);
      const p2 = GeoUtils.coordToPosition(coords1[i + 1]);

      for (let j = 0; j < coords2.length - 1; j++) {
        const p3 = GeoUtils.coordToPosition(coords2[j]);
        const p4 = GeoUtils.coordToPosition(coords2[j + 1]);

        const intersection = GeoUtils.getIntersectionPoint(p1, p2, p3, p4);
        
        if (intersection) {
          intersections.push({
            position: intersection,
            line1Name,
            line2Name,
            line1SegmentIndex: i,
            line2SegmentIndex: j
          });
        }
      }
    }

    return intersections;
  }

  /**
   * Remove duplicate intersections that are very close to each other
   */
  private static deduplicateIntersections(
    intersections: LineIntersection[],
    tolerance: number
  ): LineIntersection[] {
    const deduplicated: LineIntersection[] = [];

    for (const intersection of intersections) {
      const isDuplicate = deduplicated.some(existing =>
        GeoUtils.getDistance(existing.position, intersection.position) < tolerance
      );

      if (!isDuplicate) {
        deduplicated.push(intersection);
      }
    }

    return deduplicated;
  }
}
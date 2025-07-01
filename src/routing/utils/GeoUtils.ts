import { Position } from '../types/routing.types';

export class GeoUtils {
  private static readonly EARTH_RADIUS_MILES = 3959;

  /**
   * Calculate distance between two points using Haversine formula
   * @returns Distance in miles
   */
  static getDistance(pos1: Position, pos2: Position): number {
    const lat1Rad = this.toRadians(pos1.lat);
    const lat2Rad = this.toRadians(pos2.lat);
    const deltaLat = this.toRadians(pos2.lat - pos1.lat);
    const deltaLng = this.toRadians(pos2.lng - pos1.lng);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return this.EARTH_RADIUS_MILES * c;
  }

  /**
   * Calculate total distance along a line
   */
  static getLineDistance(coordinates: number[][]): number {
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const pos1 = { lat: coordinates[i - 1][1], lng: coordinates[i - 1][0] };
      const pos2 = { lat: coordinates[i][1], lng: coordinates[i][0] };
      totalDistance += this.getDistance(pos1, pos2);
    }
    return totalDistance;
  }

  /**
   * Interpolate a position along a line segment
   * @param ratio - 0 to 1, where 0 is start and 1 is end
   */
  static interpolatePosition(
    start: Position,
    end: Position,
    ratio: number
  ): Position {
    return {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio
    };
  }

  /**
   * Find the closest point on a line segment to a given point
   */
  static closestPointOnLine(
    point: Position,
    lineStart: Position,
    lineEnd: Position
  ): Position {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let closest: Position;

    if (param < 0) {
      closest = lineStart;
    } else if (param > 1) {
      closest = lineEnd;
    } else {
      closest = {
        lat: lineStart.lat + param * C,
        lng: lineStart.lng + param * D
      };
    }

    return closest;
  }

  /**
   * Check if two line segments intersect
   */
  static doSegmentsIntersect(
    p1: Position,
    p2: Position,
    p3: Position,
    p4: Position
  ): boolean {
    const ccw = (A: Position, B: Position, C: Position): boolean => {
      return (C.lng - A.lng) * (B.lat - A.lat) > (B.lng - A.lng) * (C.lat - A.lat);
    };

    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }

  /**
   * Find intersection point of two line segments
   */
  static getIntersectionPoint(
    p1: Position,
    p2: Position,
    p3: Position,
    p4: Position
  ): Position | null {
    const x1 = p1.lng, y1 = p1.lat;
    const x2 = p2.lng, y2 = p2.lat;
    const x3 = p3.lng, y3 = p3.lat;
    const x4 = p4.lng, y4 = p4.lat;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0000001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        lng: x1 + t * (x2 - x1),
        lat: y1 + t * (y2 - y1)
      };
    }

    return null;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert GeoJSON coordinates to Position
   */
  static coordToPosition(coord: number[]): Position {
    return { lat: coord[1], lng: coord[0] };
  }

  /**
   * Convert Position to GeoJSON coordinates
   */
  static positionToCoord(pos: Position): number[] {
    return [pos.lng, pos.lat];
  }
}
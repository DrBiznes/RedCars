import * as turf from '@turf/turf';
import { Feature, LineString, Position } from 'geojson';

// Default speed in mph (as agreed with user)
export const DEFAULT_SPEED_MPH = 30;
export const WALKING_SPEED_MPH = 3;
// Transfer penalty in minutes
export const TRANSFER_PENALTY_MINUTES = 5;

/**
 * Calculates the distance between two points in miles.
 */
export function calculateDistanceMiles(from: Position, to: Position): number {
    const fromPoint = turf.point(from);
    const toPoint = turf.point(to);
    return turf.distance(fromPoint, toPoint, { units: 'miles' });
}

/**
 * Calculates the time to travel a certain distance at a given speed.
 * @param distanceMiles Distance in miles
 * @param speedMph Speed in miles per hour
 * @returns Time in minutes
 */
export function calculateTravelTimeMinutes(distanceMiles: number, speedMph: number = DEFAULT_SPEED_MPH): number {
    if (speedMph <= 0) return Infinity;
    return (distanceMiles / speedMph) * 60;
}

/**
 * Finds the nearest point on a line to a given point.
 * Returns the point and the distance in miles.
 */
export function findNearestPointOnLine(pointPos: Position, line: Feature<LineString>): { point: Position; distance: number; index: number } {
    const pt = turf.point(pointPos);
    const snapped = turf.nearestPointOnLine(line, pt, { units: 'miles' });

    return {
        point: snapped.geometry.coordinates,
        distance: snapped.properties.dist || 0,
        index: snapped.properties.index || 0
    };
}

/**
 * Splits a line string at a given point.
 * This is a simplified version that finds the closest segment index and splits there.
 * Note: This might need more robust handling for complex lines.
 */
export function splitLineAtPoint(line: Feature<LineString>, pointPos: Position): Feature<LineString>[] {
    const snapped = turf.nearestPointOnLine(line, pointPos);
    return turf.lineSplit(line, snapped).features as Feature<LineString>[];
}

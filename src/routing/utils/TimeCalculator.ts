
// src/routing/utils/TimeCalculator.ts

import { getSpeedForLine } from '../data/SpeedData';

/**
 * Calculates the travel time for a segment of a transit line.
 * @param distance - The distance of the segment in miles.
 * @param lineName - The name of the transit line.
 * @returns The travel time in minutes.
 */
export function calculateTravelTime(distance: number, lineName: string): number {
  const speed = getSpeedForLine(lineName);
  if (speed <= 0) {
    return Infinity;
  }
  const timeInHours = distance / speed;
  return timeInHours * 60; // Convert to minutes
}

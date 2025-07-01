
// src/routing/data/SpeedData.ts

import speedData from './historical-speeds.json';

const DEFAULT_WALKING_SPEED_MPH = 3;

/**
 * Retrieves the travel speed for a given transit line.
 * Falls back to default speeds if specific data for the line is not available.
 * @param lineName - The name of the transit line.
 * @returns The speed in miles per hour.
 */
export function getSpeedForLine(lineName: string): number {
  if ((speedData.lines as Record<string, any>)[lineName]) {
    return (speedData.lines as Record<string, any>)[lineName].averageSpeed;
  }
  // This is a simplified fallback. You could expand this to use normal, local, express categories.
  return speedData.default.normal;
}

/**
 * Gets the penalty for transferring between lines.
 * @returns The transfer penalty in minutes.
 */
export function getTransferPenalty(): number {
  return speedData.transferPenalty;
}

/**
 * Gets the assumed walking speed.
 * @returns The walking speed in miles per hour.
 */
export function getWalkingSpeed(): number {
    return DEFAULT_WALKING_SPEED_MPH;
}

import { SpeedConfig } from '../types/routing.types';
import speedConfig from './historical-speeds.json';

export class SpeedData {
  private static config: SpeedConfig = speedConfig as SpeedConfig;

  /**
   * Get speed for a specific line in mph
   */
  static getLineSpeed(lineName: string): number {
    // Check if we have specific speed for this line
    if (this.config.lines[lineName]?.averageSpeed) {
      return this.config.lines[lineName].averageSpeed;
    }

    // Otherwise use default based on line type
    const lowerName = lineName.toLowerCase();
    if (lowerName.includes('local')) {
      return this.config.default.local;
    } else if (lowerName.includes('express')) {
      return this.config.default.express;
    } else {
      return this.config.default.normal;
    }
  }

  /**
   * Calculate travel time in minutes
   */
  static calculateTime(distanceMiles: number, speedMph: number): number {
    return (distanceMiles / speedMph) * 60;
  }

  /**
   * Get transfer penalty in minutes
   */
  static getTransferPenalty(): number {
    return this.config.transferPenalty;
  }

  /**
   * Get walking speed in mph
   */
  static getWalkingSpeed(): number {
    return this.config.walkingSpeed;
  }

  /**
   * Calculate walking time in minutes
   */
  static calculateWalkingTime(distanceMiles: number): number {
    return this.calculateTime(distanceMiles, this.config.walkingSpeed);
  }
}
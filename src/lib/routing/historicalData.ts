import { LineSpeedData } from './types';

// Updated historical line data with more realistic speeds
// Based on Pacific Electric timetables and accounting for station stops
export const HISTORICAL_LINE_DATA: LineSpeedData[] = [
  {
    name: "San Bernardino Line",
    speedMph: 38.5, // Express service with fewer stops
    type: "express"
  },
  {
    name: "Monrovia-Glendora Line", 
    speedMph: 25.0, // Local service with frequent stops
    type: "local"
  },
  {
    name: "Pasadena Short Line",
    speedMph: 18.0, // Urban service through dense areas
    type: "local"
  },
  {
    name: "Pasadena Oak Knoll Line",
    speedMph: 17.5, // Similar urban service
    type: "local"
  },
  {
    name: "Sierra Madre Line",
    speedMph: 22.0, // Mixed urban/suburban
    type: "local"
  },
  {
    name: "Glendale-Burbank Line",
    speedMph: 20.0, // Urban service
    type: "local"
  },
  {
    name: "Hollywood-Venice Line",
    speedMph: 19.0, // Urban with some express segments
    type: "local"
  },
  {
    name: "Venice Short Line",
    speedMph: 24.0, // More direct route
    type: "express"
  },
  {
    name: "Santa Monica via Sawtelle",
    speedMph: 21.0, // Mixed service
    type: "local"
  },
  {
    name: "Santa Monica Air Line",
    speedMph: 28.0, // Express service with limited stops
    type: "express"
  },
  {
    name: "San Fernando Valley Line",
    speedMph: 23.0, // Suburban service
    type: "local"
  },
  {
    name: "Long Beach Line",
    speedMph: 26.0, // Major corridor with express segments
    type: "express"
  },
  {
    name: "Newport-Balboa Line",
    speedMph: 30.0, // Long-distance express
    type: "express"
  },
  {
    name: "San Pedro via Dominguez",
    speedMph: 27.0, // Express corridor
    type: "express"
  },
  {
    name: "San Pedro via Torrance",
    speedMph: 24.0, // Local alternative
    type: "local"
  },
  {
    name: "Santa Ana Line",
    speedMph: 28.0, // Express interurban
    type: "express"
  },
  {
    name: "Whittier Line",
    speedMph: 22.0, // Suburban local
    type: "local"
  },
  {
    name: "Redondo Beach via Gardena",
    speedMph: 21.0, // Local beach service
    type: "local"
  },
  {
    name: "Redondo Beach via Inglewood",
    speedMph: 23.0, // Slightly faster alternative
    type: "local"
  },
  {
    name: "Manhattan Beach Line",
    speedMph: 20.0, // Beach local
    type: "local"
  },
  {
    name: "Hermosa Beach Line",
    speedMph: 19.0, // Beach local
    type: "local"
  },
  {
    name: "Venice Boulevard Line",
    speedMph: 18.0, // Urban boulevard service
    type: "local"
  },
  {
    name: "Washington Boulevard Line",
    speedMph: 17.0, // Urban street running
    type: "local"
  },
  {
    name: "Watts Line",
    speedMph: 19.0, // Urban local
    type: "local"
  },
  {
    name: "Riverside-Rialto Line",
    speedMph: 35.0, // Long-distance interurban
    type: "express"
  },
  {
    name: "Pomona-Claremont Line",
    speedMph: 26.0, // Suburban service
    type: "local"
  },
  {
    name: "Fullerton Line",
    speedMph: 25.0, // Suburban service
    type: "local"
  }
];

// Default speeds for lines not in historical data
export const DEFAULT_SPEEDS = {
  express: 28.0, // Average express speed
  local: 20.0,   // Average local speed
  streetcar: 12.0 // For street-running sections
};

// Station stop time in minutes
export const STATION_STOP_TIME = 0.5; // 30 seconds average

// Transfer time penalties in minutes
export const TRANSFER_TIMES = {
  sameStation: 2.0,      // Transfer at the same station
  nearbyStation: 5.0,    // Transfer requiring short walk
  distantStation: 10.0   // Transfer requiring longer walk
};

/**
 * Get speed data for a specific line
 */
export function getLineSpeed(lineName: string): LineSpeedData {
  // Clean the line name for matching
  const cleanName = lineName.trim().toLowerCase();
  
  // Try exact match first
  const exactMatch = HISTORICAL_LINE_DATA.find(line => 
    line.name.toLowerCase() === cleanName
  );
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // Try partial match
  const partialMatch = HISTORICAL_LINE_DATA.find(line => 
    cleanName.includes(line.name.toLowerCase()) ||
    line.name.toLowerCase().includes(cleanName)
  );
  
  if (partialMatch) {
    return partialMatch;
  }
  
  // Determine type based on line characteristics
  const isExpress = 
    cleanName.includes('express') ||
    cleanName.includes('limited') ||
    cleanName.includes('air line') ||
    cleanName.includes('flyer');
    
  const isStreetcar = 
    cleanName.includes('street') ||
    cleanName.includes('boulevard') ||
    cleanName.includes('avenue');
  
  // Return appropriate default
  if (isStreetcar) {
    return {
      name: lineName,
      speedMph: DEFAULT_SPEEDS.streetcar,
      type: 'local'
    };
  } else if (isExpress) {
    return {
      name: lineName,
      speedMph: DEFAULT_SPEEDS.express,
      type: 'express'
    };
  } else {
    return {
      name: lineName,
      speedMph: DEFAULT_SPEEDS.local,
      type: 'local'
    };
  }
}

/**
 * Calculate realistic travel time including station stops
 */
export function calculateTravelTime(
  distance: number,
  lineSpeed: LineSpeedData,
  numberOfStops: number = 0
): number {
  // Base travel time
  const baseTime = (distance / lineSpeed.speedMph) * 60;
  
  // Add station stop time
  const stopTime = numberOfStops * STATION_STOP_TIME;
  
  // Add acceleration/deceleration penalty (about 10% for local, 5% for express)
  const accelerationPenalty = lineSpeed.type === 'local' ? 0.1 : 0.05;
  const adjustedTime = baseTime * (1 + accelerationPenalty);
  
  return adjustedTime + stopTime;
}

/**
 * Get transfer time based on transfer type
 */
export function getTransferTime(
  fromLine: string,
  toLine: string,
  transferDistance: number
): number {
  // If same line, no transfer needed
  if (fromLine === toLine) {
    return 0;
  }
  
  // Based on distance between transfer points
  if (transferDistance < 0.05) { // Less than ~250 feet
    return TRANSFER_TIMES.sameStation;
  } else if (transferDistance < 0.2) { // Less than ~1000 feet
    return TRANSFER_TIMES.nearbyStation;
  } else {
    return TRANSFER_TIMES.distantStation;
  }
}
import { LineSpeedData } from './types';

export const HISTORICAL_LINE_DATA: LineSpeedData[] = [
  {
    name: "San Bernardino Line",
    speedMph: 33.1, // 57.8 miles in ~1h 45m
    type: "express"
  },
  {
    name: "Monrovia-Glendora Line", 
    speedMph: 22.2, // 27.8 miles in ~1h 15m
    type: "local"
  },
  {
    name: "Pasadena Short Line",
    speedMph: 14.5, // 10.9 miles in ~45m
    type: "local"
  },
  {
    name: "Pasadena Oak Knoll Line",
    speedMph: 14.0, // 11.7 miles in ~50m
    type: "local"
  },
  {
    name: "Sierra Madre Line",
    speedMph: 18.4, // 16.9 miles in ~55m
    type: "local"
  },
  {
    name: "Glendale-Burbank Line",
    speedMph: 15.9, // 11.9 miles in ~45m
    type: "local"
  },
  {
    name: "Hollywood-Venice Line",
    speedMph: 15.0, // 17.5 miles in ~1h 10m
    type: "local"
  },
  {
    name: "Venice Short Line",
    speedMph: 18.7, // 15.6 miles in ~50m
    type: "express"
  },
  {
    name: "Santa Monica via Sawtelle",
    speedMph: 18.7, // 17.1 miles in ~55m
    type: "local"
  },
  {
    name: "San Fernando Valley Line",
    speedMph: 19.8, // 24.8 miles in ~1h 15m
    type: "local"
  },
  {
    name: "Long Beach Line",
    speedMph: 20.4, // 20.4 miles in ~60m
    type: "express"
  },
  {
    name: "Newport-Balboa Line",
    speedMph: 24.4, // 40.7 miles in ~1h 40m
    type: "express"
  },
  {
    name: "San Pedro via Dominguez",
    speedMph: 22.9, // 24.8 miles in ~1h 5m
    type: "express"
  },
  {
    name: "Santa Ana Line",
    speedMph: 22.5, // 33.7 miles in ~1h 30m
    type: "express"
  },
  {
    name: "Whittier Line",
    speedMph: 18.4, // 16.9 miles in ~55m
    type: "local"
  },
  {
    name: "Redondo via Gardena",
    speedMph: 18.5, // 21.6 miles in ~1h 10m
    type: "local"
  }
];

// Default speeds for lines not in historical data
export const DEFAULT_SPEEDS = {
  express: 25.0,
  local: 15.0
};

export function getLineSpeed(lineName: string): LineSpeedData {
  const match = HISTORICAL_LINE_DATA.find(line => 
    lineName.toLowerCase().includes(line.name.toLowerCase()) ||
    line.name.toLowerCase().includes(lineName.toLowerCase())
  );
  
  if (match) {
    return match;
  }
  
  // Default based on line description patterns
  const isLocal = lineName.toLowerCase().includes('local') || 
                  lineName.toLowerCase().includes('short');
  
  return {
    name: lineName,
    speedMph: isLocal ? DEFAULT_SPEEDS.local : DEFAULT_SPEEDS.express,
    type: isLocal ? 'local' : 'express'
  };
}
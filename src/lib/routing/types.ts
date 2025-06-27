export interface RouteNode {
  id: string;
  coordinates: [number, number];
  lines: string[];
  type: 'intersection' | 'endpoint' | 'station';
}

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
  line: string;
  distance: number;
  travelTimeMinutes: number;
  coordinates: [number, number][];
  type: 'express' | 'local';
}

export interface RouteGraph {
  nodes: Map<string, RouteNode>;
  edges: Map<string, RouteEdge>;
  adjacencyList: Map<string, string[]>;
}

export interface RouteResult {
  path: RouteNode[];
  edges: RouteEdge[];
  totalDistance: number;
  totalTimeMinutes: number;
  transfers: number;
  lines: string[];
}

export interface LineSpeedData {
  name: string;
  speedMph: number;
  type: 'express' | 'local';
}

export interface RoutingOptions {
  startPoint: [number, number];
  endPoint: [number, number];
  optimizeFor: 'time' | 'distance' | 'transfers';
  maxWalkingDistance?: number;
}
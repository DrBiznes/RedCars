export interface Position {
  lat: number;
  lng: number;
}

export interface Station {
  id: string;
  name?: string;
  position: Position;
  lineNames: string[];
  isIntersection: boolean;
  isHistorical: boolean;
}

export interface Edge {
  from: string;
  to: string;
  distance: number; // miles
  time: number; // minutes
  lineNames: string[];
  isTransfer: boolean;
}

export interface RouteSegment {
  from: Station;
  to: Station;
  lineName: string;
  distance: number;
  time: number;
  isTransfer: boolean;
  isWalking: boolean;
}

export interface RouteResult {
  path: Station[];
  segments: RouteSegment[];
  totalDistance: number;
  totalTime: number;
  walkingTime: number;
  transitTime: number;
  transfers: number;
  lines: string[];
}

export interface GraphNode {
  station: Station;
  edges: Edge[];
}

export interface RouteGraph {
  nodes: Map<string, GraphNode>;
}

export interface SpeedConfig {
  default: {
    normal: number;
    local: number;
    express: number;
  };
  lines: Record<string, {
    averageSpeed: number;
  }>;
  transferPenalty: number;
  walkingSpeed: number;
}
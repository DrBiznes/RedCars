
import { Feature, Point, LineString } from "geojson";

// Represents a physical or virtual station on the transit network
export interface Station {
  id: string;
  name: string;
  position: [number, number]; // [longitude, latitude]
  lines: string[];
  isIntersection: boolean;
  isMajor: boolean; // True if it's from the GeoJSON, false if generated
}

// Node in the routing graph, representing a station
export interface StationNode {
  id: string;
  station: Station;
  edges: Edge[];
}

// Edge in the routing graph, representing a connection between two stations
export interface Edge {
  to: StationNode;
  weight: number; // Travel time in minutes
  line: string;
  distance: number; // in miles
}

// Represents a segment of a calculated route
export interface RouteSegment {
  from: Station;
  to: Station;
  line: string;
  time: number;
  distance: number;
}

// The final result of a route calculation
export interface RouteResult {
  path: Station[];
  totalTime: number;
  totalDistance: number;
  segments: RouteSegment[];
  transfers: number;
  walkingTime: number;
}

// GeoJSON properties for station features
export interface StationProperties {
  name: string;
  line: string;
  [key: string]: any;
}

// GeoJSON properties for line features
export interface LineProperties {
  name: string;
  [key: string]: any;
}

export type StationFeature = Feature<Point, StationProperties>;
export type LineFeature = Feature<LineString, LineProperties>;

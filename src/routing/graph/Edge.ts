
// src/routing/graph/Edge.ts

import { StationNode } from './Node';

export interface Edge {
  to: StationNode;
  weight: number; // Travel time in minutes
  line: string;
  distance: number; // in miles
}

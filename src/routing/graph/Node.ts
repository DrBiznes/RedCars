
// src/routing/graph/Node.ts

import { Station, Edge } from '../types/routing.types';

export class StationNode {
  id: string;
  station: Station;
  edges: Edge[] = [];

  constructor(station: Station) {
    this.id = station.id;
    this.station = station;
  }

  addEdge(edge: Edge) {
    this.edges.push(edge);
  }
}

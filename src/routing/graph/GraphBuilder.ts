
// src/routing/graph/GraphBuilder.ts

import { Station } from '../types/routing.types';
import { StationNode } from './Node';
import { haversineDistance } from '../utils/GeoUtils';
import { calculateTravelTime } from '../utils/TimeCalculator';
import { getTransferPenalty } from '../data/SpeedData';

/**
 * Builds a routing graph from a list of stations.
 * @param stations - An array of all generated Station objects.
 * @returns A map representing the graph, where keys are station IDs and values are StationNode objects.
 */
export function buildGraph(stations: Station[]): Map<string, StationNode> {
  const graph = new Map<string, StationNode>();

  // 1. Create a node for each station
  stations.forEach(station => {
    graph.set(station.id, new StationNode(station));
  });

  // 2. Connect consecutive stations on the same line
  const lines = new Map<string, Station[]>();
  stations.forEach(station => {
    station.lines.forEach(lineName => {
      if (!lines.has(lineName)) {
        lines.set(lineName, []);
      }
      lines.get(lineName)!.push(station);
    });
  });

  lines.forEach((lineStations, lineName) => {
    // Sort stations by their position along the line (this is an approximation)
    // A more accurate way would be to project them onto the line's path
    lineStations.sort((a, b) => a.position[0] - b.position[0] || a.position[1] - b.position[1]);

    for (let i = 0; i < lineStations.length - 1; i++) {
      const fromNode = graph.get(lineStations[i].id)!;
      const toNode = graph.get(lineStations[i + 1].id)!;
      const distance = haversineDistance(fromNode.station.position, toNode.station.position);
      const weight = calculateTravelTime(distance, lineName);

      fromNode.addEdge({ to: toNode, weight, line: lineName, distance });
      toNode.addEdge({ to: fromNode, weight, line: lineName, distance }); // Bidirectional
    }
  });

  // 3. Add transfer edges at intersection stations
  stations.forEach(station => {
    if (station.isIntersection && station.lines.length > 1) {
      // In this model, the transfer is implicitly handled by Dijkstra's algorithm
      // when it switches from an edge of one line to an edge of another at this node.
      // A penalty can be added during the pathfinding step.
    }
  });

  return graph;
}

import { RouteGraph, Station } from '../types/routing.types';
import { Node } from '../graph/Node';
import { SpeedData } from '../data/SpeedData';

export class Dijkstra {
  private nodes: Map<string, Node> = new Map();

  constructor(private graph: RouteGraph) {
    // Initialize nodes
    for (const [stationId, graphNode] of graph.nodes) {
      this.nodes.set(stationId, new Node(graphNode.station));
    }
  }

  /**
   * Find shortest path between two stations
   */
  findPath(startStationId: string, endStationId: string): Node[] | null {
    this.resetNodes();

    const startNode = this.nodes.get(startStationId);
    const endNode = this.nodes.get(endStationId);

    if (!startNode || !endNode) {
      return null;
    }

    startNode.distance = 0;
    const unvisited = new Set(this.nodes.values());

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let currentNode: Node | null = null;
      let minDistance = Infinity;

      for (const node of unvisited) {
        if (node.distance < minDistance) {
          minDistance = node.distance;
          currentNode = node;
        }
      }

      if (!currentNode || currentNode.distance === Infinity) {
        break; // No path exists
      }

      if (currentNode === endNode) {
        // Found the destination
        return this.reconstructPath(endNode);
      }

      currentNode.visited = true;
      unvisited.delete(currentNode);

      // Update distances to neighbors
      const graphNode = this.graph.nodes.get(currentNode.station.id);
      if (graphNode) {
        for (const edge of graphNode.edges) {
          const neighborNode = this.nodes.get(edge.to);
          if (!neighborNode || neighborNode.visited) continue;

          let edgeTime = edge.time;

          // Add transfer penalty if changing lines
          if (currentNode.previous) {
            const previousEdge = this.graph.nodes
              .get(currentNode.previous.station.id)
              ?.edges.find(e => e.to === currentNode.station.id);
            
            if (previousEdge && !this.haveSameLine(previousEdge.lineNames, edge.lineNames)) {
              edgeTime += SpeedData.getTransferPenalty();
            }
          }

          const altDistance = currentNode.distance + edgeTime;

          if (altDistance < neighborNode.distance) {
            neighborNode.distance = altDistance;
            neighborNode.previous = currentNode;
          }
        }
      }
    }

    return null; // No path found
  }

  /**
   * Check if two edge sets share at least one line
   */
  private haveSameLine(lines1: string[], lines2: string[]): boolean {
    return lines1.some(line => lines2.includes(line));
  }

  /**
   * Reconstruct path from end node
   */
  private reconstructPath(endNode: Node): Node[] {
    const path: Node[] = [];
    let current: Node | null = endNode;

    while (current) {
      path.unshift(current);
      current = current.previous;
    }

    return path;
  }

  /**
   * Reset all nodes for a new search
   */
  private resetNodes(): void {
    for (const node of this.nodes.values()) {
      node.reset();
    }
  }
}
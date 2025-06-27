import { RouteGraph, RouteNode, RouteEdge, RouteResult, RoutingOptions } from './types';
import { calculateDistance, projectPointToLine } from './geometry';

interface DijkstraNode {
  id: string;
  distance: number;
  previous: string | null;
  previousEdge: string | null;
}

export class RouteFinder {
  private graph: RouteGraph;

  constructor(graph: RouteGraph) {
    this.graph = graph;
  }

  /**
   * Find the best route between start and end points
   */
  findRoute(options: RoutingOptions): RouteResult | null {
    const { startPoint, endPoint, optimizeFor = 'time', maxWalkingDistance = 0.5 } = options;

    // Find nearest nodes to start and end points
    const startNodes = this.findNearestNodes(startPoint, maxWalkingDistance);
    const endNodes = this.findNearestNodes(endPoint, maxWalkingDistance);

    console.log(`Found ${startNodes.length} start nodes within ${maxWalkingDistance} miles`);
    console.log(`Found ${endNodes.length} end nodes within ${maxWalkingDistance} miles`);

    if (startNodes.length === 0) {
      console.warn('No Pacific Electric stations found near start point. Try placing marker closer to a red line.');
      return null;
    }
    
    if (endNodes.length === 0) {
      console.warn('No Pacific Electric stations found near end point. Try placing marker closer to a red line.');
      return null;
    }

    let bestRoute: RouteResult | null = null;
    let bestScore = Infinity;

    // Try all combinations of start and end nodes
    for (const startNode of startNodes) {
      for (const endNode of endNodes) {
        const route = this.dijkstraSearch(
          startNode.nodeId, 
          endNode.nodeId, 
          optimizeFor
        );

        if (route) {
          // Add walking segments
          const completeRoute = this.addWalkingSegments(
            route,
            startPoint,
            endPoint,
            startNode,
            endNode
          );

          const score = this.calculateRouteScore(completeRoute, optimizeFor);
          if (score < bestScore) {
            bestScore = score;
            bestRoute = completeRoute;
          }
        }
      }
    }

    // Clean up any virtual nodes that were created
    this.cleanupVirtualNodes();
    
    return bestRoute;
  }

  /**
   * Remove virtual nodes that were temporarily added for routing
   */
  private cleanupVirtualNodes(): void {
    const virtualNodeIds: string[] = [];
    
    this.graph.nodes.forEach((_, nodeId) => {
      if (nodeId.startsWith('virtual_')) {
        virtualNodeIds.push(nodeId);
      }
    });
    
    virtualNodeIds.forEach(nodeId => {
      // Remove from adjacency lists
      const neighbors = this.graph.adjacencyList.get(nodeId) || [];
      neighbors.forEach(neighborId => {
        const neighborList = this.graph.adjacencyList.get(neighborId);
        if (neighborList) {
          const index = neighborList.indexOf(nodeId);
          if (index > -1) {
            neighborList.splice(index, 1);
          }
        }
      });
      
      // Remove the virtual node
      this.graph.nodes.delete(nodeId);
      this.graph.adjacencyList.delete(nodeId);
    });
    
    if (virtualNodeIds.length > 0) {
      console.log(`Cleaned up ${virtualNodeIds.length} virtual nodes`);
    }
  }

  /**
   * Find nodes within walking distance of a point
   * This now includes both direct node proximity and projection onto line segments
   */
  private findNearestNodes(
    point: [number, number], 
    maxDistance: number
  ): Array<{ nodeId: string, distance: number, walkingTime: number }> {
    const nearbyNodes: Array<{ nodeId: string, distance: number, walkingTime: number }> = [];
    const walkingSpeedMph = 3.0; // Average walking speed

    // Method 1: Find nodes directly within range
    this.graph.nodes.forEach((node, nodeId) => {
      const distance = calculateDistance(point, node.coordinates);
      if (distance <= maxDistance) {
        const walkingTime = (distance / walkingSpeedMph) * 60;
        nearbyNodes.push({ nodeId, distance, walkingTime });
      }
    });

    // Method 2: If no direct nodes found, create virtual access points by projecting onto nearby line segments
    if (nearbyNodes.length === 0) {
      const virtualNodes = this.createVirtualAccessPoints(point, maxDistance);
      nearbyNodes.push(...virtualNodes);
    }

    // Sort by distance
    nearbyNodes.sort((a, b) => a.distance - b.distance);
    
    console.log(`Found ${nearbyNodes.length} accessible nodes within ${maxDistance} miles of [${point[0].toFixed(6)}, ${point[1].toFixed(6)}]`);
    
    return nearbyNodes;
  }

  /**
   * Create virtual access points by projecting the point onto nearby line segments
   */
  private createVirtualAccessPoints(
    point: [number, number],
    maxDistance: number
  ): Array<{ nodeId: string, distance: number, walkingTime: number }> {
    const virtualNodes: Array<{ nodeId: string, distance: number, walkingTime: number }> = [];
    const walkingSpeedMph = 3.0;
    let virtualNodeCounter = 0;

    this.graph.edges.forEach((edge, edgeId) => {
      const projection = projectPointToLine(point, edge.coordinates);
      
      if (projection.distance <= maxDistance) {
        // Create a virtual node ID
        const virtualNodeId = `virtual_${virtualNodeCounter++}_${edgeId}`;
        
        // Create virtual node
        const virtualNode: RouteNode = {
          id: virtualNodeId,
          coordinates: projection.point,
          lines: [edge.line],
          type: 'station'
        };
        
        // Temporarily add to graph for routing
        this.graph.nodes.set(virtualNodeId, virtualNode);
        
        // Connect virtual node to the edge's endpoints
        const fromNode = this.graph.nodes.get(edge.from);
        const toNode = this.graph.nodes.get(edge.to);
        
        if (fromNode && toNode) {
          // Add to adjacency list
          this.graph.adjacencyList.set(virtualNodeId, [edge.from, edge.to]);
          this.graph.adjacencyList.get(edge.from)?.push(virtualNodeId);
          this.graph.adjacencyList.get(edge.to)?.push(virtualNodeId);
        }
        
        const walkingTime = (projection.distance / walkingSpeedMph) * 60;
        virtualNodes.push({ 
          nodeId: virtualNodeId, 
          distance: projection.distance, 
          walkingTime 
        });
      }
    });

    console.log(`Created ${virtualNodes.length} virtual access points`);
    return virtualNodes;
  }

  /**
   * Dijkstra's algorithm for shortest path
   */
  private dijkstraSearch(
    startNodeId: string,
    endNodeId: string,
    optimizeFor: 'time' | 'distance' | 'transfers'
  ): RouteResult | null {
    const distances = new Map<string, DijkstraNode>();
    const unvisited = new Set<string>();

    // Initialize all nodes
    this.graph.nodes.forEach((_, nodeId) => {
      distances.set(nodeId, {
        id: nodeId,
        distance: nodeId === startNodeId ? 0 : Infinity,
        previous: null,
        previousEdge: null
      });
      unvisited.add(nodeId);
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNodeId: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const node = distances.get(nodeId)!;
        if (node.distance < minDistance) {
          minDistance = node.distance;
          currentNodeId = nodeId;
        }
      }

      if (currentNodeId === null || minDistance === Infinity) {
        break; // No path found
      }

      unvisited.delete(currentNodeId);

      if (currentNodeId === endNodeId) {
        // Found the destination
        return this.reconstructPath(distances, startNodeId, endNodeId);
      }

      // Check all neighbors
      const neighbors = this.graph.adjacencyList.get(currentNodeId) || [];
      for (const neighborId of neighbors) {
        if (!unvisited.has(neighborId)) continue;

        const edge = this.findEdgeBetweenNodes(currentNodeId, neighborId);
        if (!edge) continue;

        const edgeWeight = this.calculateEdgeWeight(edge, optimizeFor);
        const currentNode = distances.get(currentNodeId)!;
        const neighborNode = distances.get(neighborId)!;

        // Add transfer penalty if switching lines
        let transferPenalty = 0;
        if (currentNode.previousEdge) {
          const previousEdge = this.graph.edges.get(currentNode.previousEdge);
          if (previousEdge && previousEdge.line !== edge.line) {
            transferPenalty = optimizeFor === 'transfers' ? 100 : 5; // 5 minute transfer penalty
          }
        }

        const newDistance = currentNode.distance + edgeWeight + transferPenalty;

        if (newDistance < neighborNode.distance) {
          distances.set(neighborId, {
            id: neighborId,
            distance: newDistance,
            previous: currentNodeId,
            previousEdge: edge.id
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Find edge between two nodes
   */
  private findEdgeBetweenNodes(nodeId1: string, nodeId2: string): RouteEdge | null {
    for (const edge of this.graph.edges.values()) {
      if ((edge.from === nodeId1 && edge.to === nodeId2) ||
          (edge.from === nodeId2 && edge.to === nodeId1)) {
        return edge;
      }
    }
    return null;
  }

  /**
   * Calculate edge weight based on optimization criteria
   */
  private calculateEdgeWeight(edge: RouteEdge, optimizeFor: string): number {
    switch (optimizeFor) {
      case 'time':
        return edge.travelTimeMinutes;
      case 'distance':
        return edge.distance;
      case 'transfers':
        return 1; // Each edge counts as 1 for transfer minimization
      default:
        return edge.travelTimeMinutes;
    }
  }

  /**
   * Reconstruct path from Dijkstra results
   */
  private reconstructPath(
    distances: Map<string, DijkstraNode>,
    _startNodeId: string,
    endNodeId: string
  ): RouteResult {
    const path: RouteNode[] = [];
    const edges: RouteEdge[] = [];
    let currentNodeId: string | null = endNodeId;

    // Build path backwards
    while (currentNodeId !== null) {
      const node = this.graph.nodes.get(currentNodeId)!;
      path.unshift(node);

      const dijkstraNode: DijkstraNode = distances.get(currentNodeId)!;
      if (dijkstraNode.previousEdge) {
        const edge = this.graph.edges.get(dijkstraNode.previousEdge)!;
        edges.unshift(edge);
      }

      currentNodeId = dijkstraNode.previous;
    }

    // Calculate totals
    const totalDistance = edges.reduce((sum, edge) => sum + edge.distance, 0);
    const totalTimeMinutes = edges.reduce((sum, edge) => sum + edge.travelTimeMinutes, 0);
    
    // Count transfers (line changes)
    const lines = Array.from(new Set(edges.map(edge => edge.line)));
    const transfers = Math.max(0, lines.length - 1);

    return {
      path,
      edges,
      totalDistance,
      totalTimeMinutes,
      transfers,
      lines
    };
  }

  /**
   * Add walking segments to the beginning and end of route
   */
  private addWalkingSegments(
    route: RouteResult,
    _startPoint: [number, number],
    _endPoint: [number, number],
    startNode: { nodeId: string, distance: number, walkingTime: number },
    endNode: { nodeId: string, distance: number, walkingTime: number }
  ): RouteResult {
    return {
      ...route,
      totalDistance: route.totalDistance + startNode.distance + endNode.distance,
      totalTimeMinutes: route.totalTimeMinutes + startNode.walkingTime + endNode.walkingTime
    };
  }

  /**
   * Calculate overall route score for comparison
   */
  private calculateRouteScore(route: RouteResult, optimizeFor: string): number {
    switch (optimizeFor) {
      case 'time':
        return route.totalTimeMinutes;
      case 'distance':
        return route.totalDistance;
      case 'transfers':
        return route.transfers * 100 + route.totalTimeMinutes;
      default:
        return route.totalTimeMinutes;
    }
  }

  /**
   * Find closest point on any line to a given point
   */
  findClosestLinePoint(point: [number, number]): {
    point: [number, number],
    line: string,
    distance: number
  } | null {
    let closestPoint: [number, number] | null = null;
    let closestLine: string | null = null;
    let minDistance = Infinity;

    // Check all edges in the graph
    this.graph.edges.forEach(edge => {
      const projection = projectPointToLine(point, edge.coordinates);
      if (projection.distance < minDistance) {
        minDistance = projection.distance;
        closestPoint = projection.point;
        closestLine = edge.line;
      }
    });

    if (closestPoint && closestLine) {
      return {
        point: closestPoint,
        line: closestLine,
        distance: minDistance
      };
    }

    return null;
  }
}
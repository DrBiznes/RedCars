import { RouteGraph, RouteNode, RouteEdge, RouteResult, RoutingOptions } from './types';
import { calculateDistance } from './geometry';

interface RouteCandidate {
  nodeId: string;
  distance: number;
  time: number;
  transfers: number;
  path: string[];
  edges: string[];
  lastLine: string;
  walkingDistance: number;
}

export class RouteFinder {
  private graph: RouteGraph;
  private virtualNodeCounter = 0;

  constructor(graph: RouteGraph) {
    this.graph = graph;
  }

  /**
   * Find the best route between start and end points
   */
  findRoute(options: RoutingOptions): RouteResult | null {
    const { startPoint, endPoint, optimizeFor = 'time', maxWalkingDistance = 0.5 } = options;

    // Find accessible nodes from start and end points
    const startAccess = this.findAccessibleNodes(startPoint, maxWalkingDistance, 'start');
    const endAccess = this.findAccessibleNodes(endPoint, maxWalkingDistance, 'end');

    if (startAccess.length === 0 || endAccess.length === 0) {
      console.warn('No accessible Pacific Electric stations found');
      return null;
    }

    // Try all combinations and find the best route
    let bestRoute: RouteResult | null = null;
    let bestScore = Infinity;

    for (const start of startAccess) {
      for (const end of endAccess) {
        const route = this.findBestPath(
          start.nodeId,
          end.nodeId,
          optimizeFor,
          start.walkingTime,
          end.walkingTime,
          start.walkingDistance,
          end.walkingDistance
        );

        if (route) {
          const score = this.calculateRouteScore(route, optimizeFor);
          if (score < bestScore) {
            bestScore = score;
            bestRoute = route;
          }
        }
      }
    }

    // Clean up virtual nodes
    this.cleanupVirtualNodes();

    return bestRoute;
  }

  /**
   * Find nodes accessible from a point within walking distance
   */
  private findAccessibleNodes(
    point: [number, number],
    maxDistance: number,
    type: 'start' | 'end'
  ): Array<{
    nodeId: string;
    walkingDistance: number;
    walkingTime: number;
  }> {
    const accessible: Array<{
      nodeId: string;
      walkingDistance: number;
      walkingTime: number;
    }> = [];
    
    const walkingSpeedMph = 3.0;

    // Check existing nodes
    this.graph.nodes.forEach((node, nodeId) => {
      const distance = calculateDistance(point, node.coordinates);
      if (distance <= maxDistance) {
        accessible.push({
          nodeId,
          walkingDistance: distance,
          walkingTime: (distance / walkingSpeedMph) * 60
        });
      }
    });

    // If no direct access, create virtual access points
    if (accessible.length === 0) {
      const virtualAccess = this.createVirtualAccessPoints(point, maxDistance, type);
      accessible.push(...virtualAccess);
    }

    // Sort by walking distance
    accessible.sort((a, b) => a.walkingDistance - b.walkingDistance);

    return accessible;
  }

  /**
   * Create virtual nodes for accessing the network
   */
  private createVirtualAccessPoints(
    point: [number, number],
    maxDistance: number,
    type: 'start' | 'end'
  ): Array<{
    nodeId: string;
    walkingDistance: number;
    walkingTime: number;
  }> {
    const virtualNodes: Array<{
      nodeId: string;
      walkingDistance: number;
      walkingTime: number;
    }> = [];
    
    const walkingSpeedMph = 3.0;
    const checkedEdges = new Set<string>();

    // Find closest points on edges
    this.graph.edges.forEach((edge, edgeId) => {
      if (edge.line === 'TRANSFER' || edge.line === 'CONNECTOR') return;
      
      // Avoid checking the same physical edge twice
      const edgeKey = [edge.from, edge.to].sort().join('-');
      if (checkedEdges.has(edgeKey)) return;
      checkedEdges.add(edgeKey);

      // Find closest point on this edge
      let minDistance = Infinity;
      let closestPoint: [number, number] | null = null;
      let closestIndex = 0;

      for (let i = 0; i < edge.coordinates.length - 1; i++) {
        const segmentStart = edge.coordinates[i];
        const segmentEnd = edge.coordinates[i + 1];
        
        // Simple projection onto line segment
        const dx = segmentEnd[0] - segmentStart[0];
        const dy = segmentEnd[1] - segmentStart[1];
        const t = Math.max(0, Math.min(1,
          ((point[0] - segmentStart[0]) * dx + (point[1] - segmentStart[1]) * dy) /
          (dx * dx + dy * dy)
        ));
        
        const projectedPoint: [number, number] = [
          segmentStart[0] + t * dx,
          segmentStart[1] + t * dy
        ];
        
        const distance = calculateDistance(point, projectedPoint);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = projectedPoint;
          closestIndex = i;
        }
      }

      if (closestPoint && minDistance <= maxDistance) {
        // Create virtual node
        const virtualNodeId = `virtual_${type}_${this.virtualNodeCounter++}`;
        
        const virtualNode: RouteNode = {
          id: virtualNodeId,
          coordinates: closestPoint,
          lines: [edge.line],
          type: 'station'
        };
        
        // Add to graph temporarily
        this.graph.nodes.set(virtualNodeId, virtualNode);
        this.graph.adjacencyList.set(virtualNodeId, []);
        
        // Connect to edge endpoints
        this.connectVirtualNode(virtualNodeId, edge, closestIndex);
        
        virtualNodes.push({
          nodeId: virtualNodeId,
          walkingDistance: minDistance,
          walkingTime: (minDistance / walkingSpeedMph) * 60
        });
      }
    });

    return virtualNodes;
  }

  /**
   * Connect a virtual node to the network
   */
  private connectVirtualNode(
    virtualNodeId: string,
    originalEdge: RouteEdge,
    splitIndex: number
  ): void {
    const virtualNode = this.graph.nodes.get(virtualNodeId)!;
    
    // Calculate distances to edge endpoints
    const coordsBefore = originalEdge.coordinates.slice(0, splitIndex + 1);
    coordsBefore.push(virtualNode.coordinates);
    const distanceBefore = calculateDistance(
      originalEdge.coordinates[0],
      virtualNode.coordinates
    );
    
    const coordsAfter = [virtualNode.coordinates];
    coordsAfter.push(...originalEdge.coordinates.slice(splitIndex + 1));
    const distanceAfter = calculateDistance(
      virtualNode.coordinates,
      originalEdge.coordinates[originalEdge.coordinates.length - 1]
    );
    
    // Create edges maintaining the original line properties
    const speedRatio = distanceBefore / (distanceBefore + distanceAfter);
    
    // Edge from start to virtual node
    const edge1: RouteEdge = {
      id: `${originalEdge.id}_v1`,
      from: originalEdge.from,
      to: virtualNodeId,
      line: originalEdge.line,
      distance: distanceBefore,
      travelTimeMinutes: originalEdge.travelTimeMinutes * speedRatio,
      coordinates: coordsBefore,
      type: originalEdge.type
    };
    
    // Edge from virtual node to end
    const edge2: RouteEdge = {
      id: `${originalEdge.id}_v2`,
      from: virtualNodeId,
      to: originalEdge.to,
      line: originalEdge.line,
      distance: distanceAfter,
      travelTimeMinutes: originalEdge.travelTimeMinutes * (1 - speedRatio),
      coordinates: coordsAfter,
      type: originalEdge.type
    };
    
    // Add edges to graph
    this.graph.edges.set(edge1.id, edge1);
    this.graph.edges.set(edge2.id, edge2);
    
    // Update adjacency lists
    this.graph.adjacencyList.get(originalEdge.from)?.push(virtualNodeId);
    this.graph.adjacencyList.get(virtualNodeId)?.push(originalEdge.from, originalEdge.to);
    this.graph.adjacencyList.get(originalEdge.to)?.push(virtualNodeId);
  }

  /**
   * Find the best path using improved A* algorithm
   */
  private findBestPath(
    startId: string,
    endId: string,
    optimizeFor: 'time' | 'distance' | 'transfers',
    startWalkingTime: number,
    endWalkingTime: number,
    startWalkingDistance: number,
    endWalkingDistance: number
  ): RouteResult | null {
    const endNode = this.graph.nodes.get(endId);
    if (!endNode) return null;

    // Priority queue for A* search
    const openSet = new Map<string, RouteCandidate>();
    const closedSet = new Set<string>();
    
    // Initialize start node
    const startCandidate: RouteCandidate = {
      nodeId: startId,
      distance: startWalkingDistance,
      time: startWalkingTime,
      transfers: 0,
      path: [startId],
      edges: [],
      lastLine: '',
      walkingDistance: startWalkingDistance
    };
    
    openSet.set(startId, startCandidate);

    while (openSet.size > 0) {
      // Find node with lowest f-score
      let current: RouteCandidate | null = null;
      let lowestFScore = Infinity;
      
      openSet.forEach(candidate => {
        const gScore = this.getGScore(candidate, optimizeFor);
        const hScore = this.getHeuristic(candidate.nodeId, endId, optimizeFor);
        const fScore = gScore + hScore;
        
        if (fScore < lowestFScore) {
          lowestFScore = fScore;
          current = candidate;
        }
      });
      
      if (!current) break;
      
      openSet.delete(current.nodeId);
      closedSet.add(current.nodeId);
      
      // Check if we've reached the end
      if (current.nodeId === endId) {
        return this.constructRouteResult(
          current,
          startWalkingTime,
          endWalkingTime,
          startWalkingDistance,
          endWalkingDistance
        );
      }
      
      // Explore neighbors
      const neighbors = this.graph.adjacencyList.get(current.nodeId) || [];
      
      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue;
        
        const edge = this.findEdge(current.nodeId, neighborId);
        if (!edge) continue;
        
        // Calculate new candidate
        const newCandidate = this.createNeighborCandidate(current, neighborId, edge);
        
        // Check if this path is better
        const existingCandidate = openSet.get(neighborId);
        if (!existingCandidate || this.isBetterPath(newCandidate, existingCandidate, optimizeFor)) {
          openSet.set(neighborId, newCandidate);
        }
      }
    }
    
    return null;
  }

  /**
   * Create a candidate for a neighbor node
   */
  private createNeighborCandidate(
    current: RouteCandidate,
    neighborId: string,
    edge: RouteEdge
  ): RouteCandidate {
    const isTransfer = edge.line !== current.lastLine && current.lastLine !== '';
    const transferPenalty = isTransfer ? 5 : 0; // 5 minutes for transfers
    
    return {
      nodeId: neighborId,
      distance: current.distance + edge.distance,
      time: current.time + edge.travelTimeMinutes + transferPenalty,
      transfers: current.transfers + (isTransfer ? 1 : 0),
      path: [...current.path, neighborId],
      edges: [...current.edges, edge.id],
      lastLine: edge.line === 'TRANSFER' ? current.lastLine : edge.line,
      walkingDistance: current.walkingDistance + (edge.line === 'TRANSFER' ? edge.distance : 0)
    };
  }

  /**
   * Get G-score for A* algorithm
   */
  private getGScore(candidate: RouteCandidate, optimizeFor: string): number {
    switch (optimizeFor) {
      case 'time':
        return candidate.time;
      case 'distance':
        return candidate.distance;
      case 'transfers':
        return candidate.transfers * 100 + candidate.time;
      default:
        return candidate.time;
    }
  }

  /**
   * Heuristic function for A* algorithm
   */
  private getHeuristic(
    nodeId: string,
    targetId: string,
    optimizeFor: string
  ): number {
    const node = this.graph.nodes.get(nodeId);
    const target = this.graph.nodes.get(targetId);
    
    if (!node || !target) return 0;
    
    const distance = calculateDistance(node.coordinates, target.coordinates);
    
    switch (optimizeFor) {
      case 'time':
        // Assume average speed of 25 mph
        return (distance / 25) * 60;
      case 'distance':
        return distance;
      case 'transfers':
        // Minimal heuristic for transfers
        return distance / 10;
      default:
        return (distance / 25) * 60;
    }
  }

  /**
   * Check if one path is better than another
   */
  private isBetterPath(
    newPath: RouteCandidate,
    existingPath: RouteCandidate,
    optimizeFor: string
  ): boolean {
    const newScore = this.getGScore(newPath, optimizeFor);
    const existingScore = this.getGScore(existingPath, optimizeFor);
    
    // If scores are very close, prefer fewer transfers
    if (Math.abs(newScore - existingScore) < 0.1) {
      return newPath.transfers < existingPath.transfers;
    }
    
    return newScore < existingScore;
  }

  /**
   * Find edge between two nodes
   */
  private findEdge(fromId: string, toId: string): RouteEdge | null {
    for (const edge of this.graph.edges.values()) {
      if ((edge.from === fromId && edge.to === toId) ||
          (edge.from === toId && edge.to === fromId)) {
        return edge;
      }
    }
    return null;
  }

  /**
   * Construct the final route result
   */
  private constructRouteResult(
    finalCandidate: RouteCandidate,
    startWalkingTime: number,
    endWalkingTime: number,
    startWalkingDistance: number,
    endWalkingDistance: number
  ): RouteResult {
    const path: RouteNode[] = [];
    const edges: RouteEdge[] = [];
    
    // Build path and edges
    finalCandidate.path.forEach(nodeId => {
      const node = this.graph.nodes.get(nodeId);
      if (node) path.push(node);
    });
    
    finalCandidate.edges.forEach(edgeId => {
      const edge = this.graph.edges.get(edgeId);
      if (edge) edges.push(edge);
    });
    
    // Calculate unique lines (excluding transfers)
    const lines = new Set<string>();
    edges.forEach(edge => {
      if (edge.line !== 'TRANSFER' && edge.line !== 'CONNECTOR') {
        lines.add(edge.line);
      }
    });
    
    // Create line segments for better route description
    const lineSegments: string[] = [];
    let currentLine = '';
    
    edges.forEach(edge => {
      if (edge.line !== 'TRANSFER' && edge.line !== 'CONNECTOR' && edge.line !== currentLine) {
        lineSegments.push(edge.line);
        currentLine = edge.line;
      }
    });
    
    return {
      path,
      edges,
      totalDistance: finalCandidate.distance,
      totalTimeMinutes: finalCandidate.time,
      transfers: finalCandidate.transfers,
      lines: lineSegments
    };
  }

  /**
   * Calculate route score for comparison
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
   * Clean up virtual nodes after routing
   */
  private cleanupVirtualNodes(): void {
    const nodesToRemove: string[] = [];
    const edgesToRemove: string[] = [];
    
    // Find virtual nodes
    this.graph.nodes.forEach((node, nodeId) => {
      if (nodeId.startsWith('virtual_')) {
        nodesToRemove.push(nodeId);
      }
    });
    
    // Find virtual edges
    this.graph.edges.forEach((edge, edgeId) => {
      if (edgeId.includes('_v1') || edgeId.includes('_v2')) {
        edgesToRemove.push(edgeId);
      }
    });
    
    // Remove virtual nodes and their connections
    nodesToRemove.forEach(nodeId => {
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
      
      // Remove node
      this.graph.nodes.delete(nodeId);
      this.graph.adjacencyList.delete(nodeId);
    });
    
    // Remove virtual edges
    edgesToRemove.forEach(edgeId => {
      this.graph.edges.delete(edgeId);
    });
    
    this.virtualNodeCounter = 0;
  }

  /**
   * Find closest point on the network to a given point
   */
  findClosestLinePoint(point: [number, number]): {
    point: [number, number];
    line: string;
    distance: number;
  } | null {
    let closestPoint: [number, number] | null = null;
    let closestLine: string | null = null;
    let minDistance = Infinity;

    this.graph.edges.forEach(edge => {
      if (edge.line === 'TRANSFER' || edge.line === 'CONNECTOR') return;
      
      for (let i = 0; i < edge.coordinates.length - 1; i++) {
        const segmentStart = edge.coordinates[i];
        const segmentEnd = edge.coordinates[i + 1];
        
        // Project point onto segment
        const dx = segmentEnd[0] - segmentStart[0];
        const dy = segmentEnd[1] - segmentStart[1];
        const t = Math.max(0, Math.min(1,
          ((point[0] - segmentStart[0]) * dx + (point[1] - segmentStart[1]) * dy) /
          (dx * dx + dy * dy)
        ));
        
        const projectedPoint: [number, number] = [
          segmentStart[0] + t * dx,
          segmentStart[1] + t * dy
        ];
        
        const distance = calculateDistance(point, projectedPoint);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = projectedPoint;
          closestLine = edge.line;
        }
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
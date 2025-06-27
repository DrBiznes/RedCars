import { RouteGraph, RouteNode, RouteEdge, RouteResult, RoutingOptions } from './types';
import { calculateDistance, projectPointToLine } from './geometry';

// Internal types for the finder
interface RouteCandidate {
  nodeId: string;
  distance: number;
  time: number;
  transfers: number;
  path: string[];
  edges: RouteEdge[];
  lastLine: string;
}

interface AccessPoint {
  edge: RouteEdge;
  point: [number, number];
  distance: number;
}

export class RouteFinder {
  private graph: RouteGraph;
  private virtualNodeCounter = 0;
  private edgeIdCounter = 0;
  // This will now store the original edges that get replaced
  private modifiedEdges: Map<string, RouteEdge> = new Map();

  constructor(graph: RouteGraph) {
    this.graph = graph;
  }

  findRoute(options: RoutingOptions): RouteResult | null {
    const { startPoint, endPoint, optimizeFor = 'time', maxWalkingDistance = 1.0 } = options;

    // 1. Find the best physical connection points on the graph first
    const startAccess = this.findClosestAccessPoint(startPoint);
    const endAccess = this.findClosestAccessPoint(endPoint);

    if (!startAccess || startAccess.distance > maxWalkingDistance || !endAccess || endAccess.distance > maxWalkingDistance) {
        console.warn('No accessible PE stations found within max walking distance.');
        return null;
    }

    // 2. Now, create virtual nodes and splice them into the graph correctly.
    // This is the new, robust logic.
    this.setupVirtualGraph(startAccess, endAccess);

    // 3. Find the path using the temporarily modified graph
    const route = this.findBestPath(`virtual_start_0`, `virtual_end_1`, optimizeFor);

    // 4. IMPORTANT: Restore the graph to its original state
    this.cleanupVirtualGraph();

    if (!route) {
      return null;
    }
    
    // 5. Add walking distance/time to the final rail result
    const walkingSpeedMph = 3.0;
    route.totalDistance += startAccess.distance + endAccess.distance;
    route.totalTimeMinutes += ((startAccess.distance + endAccess.distance) / walkingSpeedMph) * 60;

    return route;
  }

  private setupVirtualGraph(startAccess: AccessPoint, endAccess: AccessPoint): void {
    // If start and end points are on the same edge, handle it with one special function
    if (startAccess.edge.id === endAccess.edge.id) {
        this.spliceTwoNodesIntoEdge(startAccess, endAccess);
    } else {
        // Otherwise, splice them in individually
        this.spliceNodeIntoEdge(startAccess, 'start');
        this.spliceNodeIntoEdge(endAccess, 'end');
    }
  }

  private spliceNodeIntoEdge(access: AccessPoint, type: 'start' | 'end'): string {
    const virtualNodeId = `virtual_${type}_${this.virtualNodeCounter++}`;
    const virtualNode: RouteNode = {
        id: virtualNodeId,
        coordinates: access.point,
        lines: [access.edge.line],
        type: 'station',
    };
    this.graph.nodes.set(virtualNodeId, virtualNode);
    this.graph.adjacencyList.set(virtualNodeId, []);

    const originalEdge = access.edge;
    if (!this.modifiedEdges.has(originalEdge.id)) {
        this.modifiedEdges.set(originalEdge.id, { ...originalEdge });
    }
    
    // Disconnect original edge from endpoints
    const fromAdj = this.graph.adjacencyList.get(originalEdge.from)!;
    const fromIndex = fromAdj.findIndex(edgeId => this.graph.edges.get(edgeId)?.id === originalEdge.id);
    if (fromIndex > -1) fromAdj.splice(fromIndex, 1);

    const toAdj = this.graph.adjacencyList.get(originalEdge.to)!;
    const toIndex = toAdj.findIndex(edgeId => this.graph.edges.get(edgeId)?.id === originalEdge.id);
    if (toIndex > -1) toAdj.splice(toIndex, 1);

    // Create new edges
    this.createSplicedEdge(originalEdge.from, virtualNodeId, originalEdge);
    this.createSplicedEdge(virtualNodeId, originalEdge.to, originalEdge);
    
    return virtualNodeId;
  }
  
  private spliceTwoNodesIntoEdge(startAccess: AccessPoint, endAccess: AccessPoint): void {
      const edge = startAccess.edge;
      const startNodeId = `virtual_start_${this.virtualNodeCounter++}`;
      const endNodeId = `virtual_end_${this.virtualNodeCounter++}`;
      
      const startVirtualNode: RouteNode = { id: startNodeId, coordinates: startAccess.point, lines: [edge.line], type: 'station' };
      const endVirtualNode: RouteNode = { id: endNodeId, coordinates: endAccess.point, lines: [edge.line], type: 'station' };
      
      this.graph.nodes.set(startNodeId, startVirtualNode);
      this.graph.adjacencyList.set(startNodeId, []);
      this.graph.nodes.set(endNodeId, endVirtualNode);
      this.graph.adjacencyList.set(endNodeId, []);
      
      if (!this.modifiedEdges.has(edge.id)) {
          this.modifiedEdges.set(edge.id, { ...edge });
      }
      
      const fromAdj = this.graph.adjacencyList.get(edge.from)!;
      const fromIndex = fromAdj.findIndex(edgeId => this.graph.edges.get(edgeId)?.id === edge.id);
      if (fromIndex > -1) fromAdj.splice(fromIndex, 1);

      const toAdj = this.graph.adjacencyList.get(edge.to)!;
      const toIndex = toAdj.findIndex(edgeId => this.graph.edges.get(edgeId)?.id === edge.id);
      if (toIndex > -1) toAdj.splice(toIndex, 1);
      
      // Determine order of virtual nodes along the edge
      const distStart = calculateDistance(this.graph.nodes.get(edge.from)!.coordinates, startAccess.point);
      const distEnd = calculateDistance(this.graph.nodes.get(edge.from)!.coordinates, endAccess.point);

      const firstVirtualId = distStart < distEnd ? startNodeId : endNodeId;
      const secondVirtualId = distStart < distEnd ? endNodeId : startNodeId;

      // Create three new edges
      this.createSplicedEdge(edge.from, firstVirtualId, edge);
      this.createSplicedEdge(firstVirtualId, secondVirtualId, edge);
      this.createSplicedEdge(secondVirtualId, edge.to, edge);
  }

  private createSplicedEdge(fromId: string, toId: string, originalEdge: RouteEdge): void {
    const fromNode = this.graph.nodes.get(fromId)!;
    const toNode = this.graph.nodes.get(toId)!;
    const distance = calculateDistance(fromNode.coordinates, toNode.coordinates);
    const timeRatio = originalEdge.distance > 0 ? distance / originalEdge.distance : 0;

    const newEdge: RouteEdge = {
        id: `v-edge_${this.edgeIdCounter++}`,
        from: fromId,
        to: toId,
        line: originalEdge.line,
        distance: distance,
        travelTimeMinutes: originalEdge.travelTimeMinutes * timeRatio,
        coordinates: [fromNode.coordinates, toNode.coordinates],
        type: originalEdge.type,
    };
    this.graph.edges.set(newEdge.id, newEdge);
    this.graph.adjacencyList.get(fromId)!.push(newEdge.id);
    this.graph.adjacencyList.get(toId)!.push(newEdge.id);
  }
  
  private cleanupVirtualGraph(): void {
      this.graph.edges.forEach((edge, edgeId) => {
          if (edgeId.startsWith('v-edge_')) {
              this.graph.edges.delete(edgeId);
          }
      });
      this.graph.nodes.forEach((node, nodeId) => {
          if (nodeId.startsWith('virtual_')) {
              this.graph.nodes.delete(nodeId);
              this.graph.adjacencyList.delete(nodeId);
          }
      });
      this.modifiedEdges.forEach((originalEdge, edgeId) => {
          this.graph.edges.set(edgeId, originalEdge);
          this.graph.adjacencyList.get(originalEdge.from)!.push(edgeId);
          this.graph.adjacencyList.get(originalEdge.to)!.push(edgeId);
      });
      this.modifiedEdges.clear();
      this.virtualNodeCounter = 0;
      this.edgeIdCounter = 0;
  }

  // This function ONLY finds the best point, it does NOT modify the graph.
  private findClosestAccessPoint(point: [number, number]): AccessPoint | null {
    let bestAccess: AccessPoint | null = null;
    let minDistance = Infinity;

    this.graph.edges.forEach(edge => {
        if (edge.type !== 'rail') return;

        const projection = projectPointToLine(point, edge.coordinates);
        if (projection.distance < minDistance) {
            minDistance = projection.distance;
            bestAccess = {
                edge: edge,
                point: projection.point,
                distance: projection.distance,
            };
        }
    });
    return bestAccess;
  }

  // A* Search Algorithm
  private findBestPath(startId: string, endId: string, optimizeFor: 'time' | 'distance' | 'transfers'): RouteResult | null {
    const openSet = new Map<string, RouteCandidate>();
    const closedSet = new Set<string>();

    const startNode = this.graph.nodes.get(startId)!;
    openSet.set(startId, {
      nodeId: startId, distance: 0, time: 0, transfers: 0, path: [startId], edges: [],
      lastLine: startNode.lines.find(l => l !== 'TRANSFER') || ''
    });

    while (openSet.size > 0) {
      let currentId = [...openSet.keys()].reduce((a, b) => this.getFScore(openSet.get(a)!, endId, optimizeFor) < this.getFScore(openSet.get(b)!, endId, optimizeFor) ? a : b);
      let current = openSet.get(currentId)!;

      if (currentId === endId) return this.constructRouteResult(current);

      openSet.delete(currentId);
      closedSet.add(currentId);
      
      const neighborEdgeIds = this.graph.adjacencyList.get(currentId) || [];
      for (const edgeId of neighborEdgeIds) {
        const edge = this.graph.edges.get(edgeId);
        if (!edge) continue;

        const neighborId = edge.from === currentId ? edge.to : edge.from;
        if (closedSet.has(neighborId)) continue;
        
        const isTransfer = edge.line === 'TRANSFER';
        const isLineChange = !isTransfer && current.lastLine && edge.line !== current.lastLine;

        const newCandidate: RouteCandidate = {
          nodeId: neighborId,
          distance: current.distance + edge.distance,
          time: current.time + edge.travelTimeMinutes,
          transfers: current.transfers + (isLineChange ? 1 : 0),
          path: [...current.path, neighborId],
          edges: [...current.edges, edge],
          lastLine: isTransfer ? current.lastLine : edge.line,
        };
        
        const existing = openSet.get(neighborId);
        if (!existing || this.getGScore(newCandidate, optimizeFor) < this.getGScore(existing, optimizeFor)) {
          openSet.set(neighborId, newCandidate);
        }
      }
    }
    return null;
  }
  
  private getFScore = (c: RouteCandidate, endId: string, o: 'time' | 'distance' | 'transfers') => this.getGScore(c, o) + this.getHeuristic(c.nodeId, endId, o);

  private getGScore(candidate: RouteCandidate, optimizeFor: string): number {
    const transferPenalty = 5;
    switch (optimizeFor) {
      case 'time': return candidate.time + candidate.transfers * transferPenalty;
      case 'distance': return candidate.distance;
      case 'transfers': return candidate.transfers * 1000 + candidate.time;
      default: return candidate.time;
    }
  }

  private getHeuristic(nodeId: string, targetId: string, optimizeFor: string): number {
    const node = this.graph.nodes.get(nodeId);
    const target = this.graph.nodes.get(targetId);
    if (!node || !target) return 0;
    const distance = calculateDistance(node.coordinates, target.coordinates);
    if (optimizeFor === 'time') return (distance / 25) * 60; // 25 mph avg speed
    if (optimizeFor === 'distance') return distance;
    return 0;
  }

  private constructRouteResult(candidate: RouteCandidate): RouteResult {
    const lines = candidate.edges
        .map(e => e.line)
        .filter((l, i, arr) => l !== 'TRANSFER' && l !== 'CONNECTOR' && arr.indexOf(l) === i);

    return {
      path: candidate.path.map(id => this.graph.nodes.get(id)!),
      edges: candidate.edges,
      totalDistance: candidate.distance,
      totalTimeMinutes: candidate.time,
      transfers: candidate.transfers,
      lines: lines,
    };
  }
}

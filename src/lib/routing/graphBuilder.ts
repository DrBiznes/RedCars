import { FeatureCollection, Feature } from 'geojson';
import { RouteGraph, RouteNode, RouteEdge } from './types';
import { 
  calculateLineDistance, 
  findLineIntersections,
  calculateDistance,
  projectPointToLine
} from './geometry';
import { getLineSpeed } from './historicalData';

interface NodeCandidate {
  coordinates: [number, number];
  lines: Set<string>;
  type: RouteNode['type'];
  confidence: number;
}

export class GraphBuilder {
  private graph: RouteGraph;
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;
  private nodeCandidates: Map<string, NodeCandidate> = new Map();
  
  // Configuration constants
  private readonly INTERSECTION_TOLERANCE = 0.0001; // ~10 meters for geometric intersections
  private readonly PROXIMITY_THRESHOLD = 0.05; // ~500 feet for station transfers
  private readonly NODE_MERGE_RADIUS = 0.0002; // ~20 meters for merging nearby nodes
  private readonly STATION_SPACING = 0.5; // Approximate miles between stations

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      adjacencyList: new Map()
    };
  }

  /**
   * Build the route graph from GeoJSON line data
   */
  buildFromGeoJSON(geoJsonData: FeatureCollection): RouteGraph {
    console.log('Building improved Pacific Electric network graph...');
    
    const lineFeatures = geoJsonData.features.filter(
      feature => feature.geometry.type === 'LineString'
    );

    // Phase 1: Collect all potential nodes
    this.collectNodeCandidates(lineFeatures);
    
    // Phase 2: Merge nearby nodes and create final nodes
    this.createNodesFromCandidates();
    
    // Phase 3: Create edges with proper connections
    this.createEdgesFromLines(lineFeatures);
    
    // Phase 4: Add transfer connections
    this.createTransferConnections();
    
    // Phase 5: Validate and optimize graph
    this.validateAndOptimizeGraph();
    
    const stats = this.getGraphStats();
    console.log('Graph built:', stats);
    
    return this.graph;
  }

  private collectNodeCandidates(lineFeatures: Feature[]): void {
    // Collect endpoints
    lineFeatures.forEach(feature => {
      if (feature.geometry.type !== 'LineString') return;
      
      const coordinates = feature.geometry.coordinates as [number, number][];
      const lineName = feature.properties?.Name || 'Unknown Line';
      
      // Add endpoints
      this.addNodeCandidate(coordinates[0], lineName, 'endpoint', 1.0);
      this.addNodeCandidate(coordinates[coordinates.length - 1], lineName, 'endpoint', 1.0);
      
      // Add intermediate stations based on distance
      this.addIntermediateStations(coordinates, lineName);
    });

    // Find intersections between lines
    for (let i = 0; i < lineFeatures.length; i++) {
      for (let j = i + 1; j < lineFeatures.length; j++) {
        this.findLineIntersectionCandidates(lineFeatures[i], lineFeatures[j]);
      }
    }
  }

  private addIntermediateStations(
    coordinates: [number, number][], 
    lineName: string
  ): void {
    let accumulatedDistance = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const segmentDistance = calculateDistance(coordinates[i - 1], coordinates[i]);
      accumulatedDistance += segmentDistance;
      
      // Add a station approximately every STATION_SPACING miles
      if (accumulatedDistance >= this.STATION_SPACING) {
        this.addNodeCandidate(coordinates[i], lineName, 'station', 0.7);
        accumulatedDistance = 0;
      }
    }
  }

  private findLineIntersectionCandidates(line1: Feature, line2: Feature): void {
    if (line1.geometry.type !== 'LineString' || line2.geometry.type !== 'LineString') {
      return;
    }
    
    const coords1 = line1.geometry.coordinates as [number, number][];
    const coords2 = line2.geometry.coordinates as [number, number][];
    const line1Name = line1.properties?.Name || 'Unknown Line';
    const line2Name = line2.properties?.Name || 'Unknown Line';
    
    // Check for geometric intersections
    const intersections = findLineIntersections(coords1, coords2, this.INTERSECTION_TOLERANCE);
    intersections.forEach(point => {
      this.addNodeCandidate(point, [line1Name, line2Name], 'intersection', 1.0);
    });
  }

  private addNodeCandidate(
    coordinates: [number, number],
    lines: string | string[],
    type: RouteNode['type'],
    confidence: number
  ): void {
    const key = `${coordinates[0].toFixed(6)},${coordinates[1].toFixed(6)}`;
    
    if (this.nodeCandidates.has(key)) {
      const existing = this.nodeCandidates.get(key)!;
      
      // Add new lines
      if (Array.isArray(lines)) {
        lines.forEach(line => existing.lines.add(line));
      } else {
        existing.lines.add(lines);
      }
      
      // Update type priority: intersection > endpoint > station
      if (type === 'intersection' || 
          (type === 'endpoint' && existing.type === 'station')) {
        existing.type = type;
      }
      
      // Keep highest confidence
      existing.confidence = Math.max(existing.confidence, confidence);
    } else {
      const lineSet = new Set<string>();
      if (Array.isArray(lines)) {
        lines.forEach(line => lineSet.add(line));
      } else {
        lineSet.add(lines);
      }
      
      this.nodeCandidates.set(key, {
        coordinates,
        lines: lineSet,
        type,
        confidence
      });
    }
  }

  private createNodesFromCandidates(): void {
    const sortedCandidates = Array.from(this.nodeCandidates.values())
      .sort((a, b) => b.confidence - a.confidence);

    const createdNodes: RouteNode[] = [];

    sortedCandidates.forEach(candidate => {
        let merged = false;
        for (const existingNode of createdNodes) {
            const distance = calculateDistance(candidate.coordinates, existingNode.coordinates);
            if (distance < this.NODE_MERGE_RADIUS) {
                candidate.lines.forEach(line => {
                    if (!existingNode.lines.includes(line)) {
                        existingNode.lines.push(line);
                    }
                });
                if (candidate.type === 'intersection' && existingNode.type !== 'intersection') {
                    existingNode.type = 'intersection';
                }
                merged = true;
                break;
            }
        }

        if (!merged) {
            const nodeId = `node_${this.nodeIdCounter++}`;
            const newNode: RouteNode = {
                id: nodeId,
                coordinates: candidate.coordinates,
                lines: Array.from(candidate.lines),
                type: candidate.type,
            };
            this.graph.nodes.set(nodeId, newNode);
            this.graph.adjacencyList.set(nodeId, []);
            createdNodes.push(newNode);
        }
    });
  }


  private createEdgesFromLines(lineFeatures: Feature[]): void {
    lineFeatures.forEach(feature => {
      if (feature.geometry.type !== 'LineString') return;
      
      const coordinates = feature.geometry.coordinates as [number, number][];
      const lineName = feature.properties?.Name || 'Unknown Line';
      const lineSpeed = getLineSpeed(lineName);
      
      // Find all nodes along this line
      const nodesOnLine = this.findNodesOnLine(coordinates, lineName);
      
      if (nodesOnLine.length < 2) {
        // This is expected for very short lines or spurs, so we can demote it from a warning
        // console.warn(`Line '${lineName}' has insufficient nodes to create edges.`);
        return;
      }
      
      // Create edges between consecutive nodes
      for (let i = 0; i < nodesOnLine.length - 1; i++) {
        const fromNode = nodesOnLine[i].node;
        const toNode = nodesOnLine[i + 1].node;
        
        // Extract the portion of the line between these nodes
        const edgeCoords = this.extractEdgeCoordinates(
          coordinates,
          fromNode.coordinates,
          toNode.coordinates
        );
        
        const distance = calculateLineDistance(edgeCoords);
        
        // Calculate travel time including station stop time
        const baseTimeMinutes = (distance / lineSpeed.speedMph) * 60;
        const stopTimeMinutes = fromNode.type === 'station' ? 0.5 : 0; // 30 seconds per station
        const travelTimeMinutes = baseTimeMinutes + stopTimeMinutes;
        
        this.createEdge(
          fromNode.id,
          toNode.id,
          lineName,
          distance,
          travelTimeMinutes,
          edgeCoords,
          lineSpeed.type
        );
      }
    });
  }

  private findNodesOnLine(
    lineCoords: [number, number][], 
    lineName: string
  ): Array<{ node: RouteNode, position: number }> {
    const nodesOnLine: Array<{ node: RouteNode, position: number }> = [];
    
    this.graph.nodes.forEach(node => {
      if (!node.lines.includes(lineName)) return;
      
      const projection = projectPointToLine(node.coordinates, lineCoords);
      
      let position = 0;
      for (let i = 0; i < projection.segmentIndex; i++) {
        position += calculateDistance(lineCoords[i], lineCoords[i+1]);
      }
      position += calculateDistance(lineCoords[projection.segmentIndex], projection.point);

      if (projection.distance <= this.NODE_MERGE_RADIUS * 2) {
        nodesOnLine.push({ node, position });
      }
    });
    
    nodesOnLine.sort((a, b) => a.position - b.position);
    
    return nodesOnLine;
  }

    private extractEdgeCoordinates(
        lineCoords: [number, number][],
        startCoord: [number, number],
        endCoord: [number, number]
    ): [number, number][] {
        const startProj = projectPointToLine(startCoord, lineCoords);
        const endProj = projectPointToLine(endCoord, lineCoords);

        // Ensure startIndex is before endIndex
        const [start, end] = startProj.position <= endProj.position ? [startProj, endProj] : [endProj, startProj];
        
        const result: [number, number][] = [start.point];

        for (let i = start.segmentIndex; i <= end.segmentIndex; i++) {
            if(i > start.segmentIndex) {
                result.push(lineCoords[i]);
            }
        }
        result.push(end.point);
        
        return result;
    }

  private createTransferConnections(): void {
    const nodes = Array.from(this.graph.nodes.values());
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const node1 = nodes[i];
            const node2 = nodes[j];
            const distance = calculateDistance(node1.coordinates, node2.coordinates);

            if (distance < this.PROXIMITY_THRESHOLD) {
                const hasSharedLines = node1.lines.some(line => node2.lines.includes(line));
                if (!hasSharedLines) {
                    const walkingSpeedMph = 3.0;
                    const transferTimeMinutes = (distance / walkingSpeedMph) * 60 + 2; // 2 min penalty
                    this.createEdge(
                        node1.id,
                        node2.id,
                        'TRANSFER',
                        distance,
                        transferTimeMinutes,
                        [node1.coordinates, node2.coordinates],
                        'local'
                    );
                }
            }
        }
    }
  }

  private createEdge(
    fromId: string,
    toId: string,
    line: string,
    distance: number,
    travelTimeMinutes: number,
    coordinates: [number, number][],
    type: 'express' | 'local'
  ): void {
    const edgeId = `edge_${this.edgeIdCounter++}`;
    
    const edge: RouteEdge = {
      id: edgeId,
      from: fromId,
      to: toId,
      line,
      distance,
      travelTimeMinutes,
      coordinates,
      type
    };
    
    this.graph.edges.set(edgeId, edge);
    
    // Update adjacency list (bidirectional)
    this.graph.adjacencyList.get(fromId)?.push(edgeId);
    this.graph.adjacencyList.get(toId)?.push(edgeId);
  }

  private validateAndOptimizeGraph(): void {
    // Remove isolated nodes
    const isolatedNodes: string[] = [];
    this.graph.nodes.forEach((_, nodeId) => {
      const neighbors = this.graph.adjacencyList.get(nodeId) || [];
      if (neighbors.length === 0) {
        isolatedNodes.push(nodeId);
      }
    });
    
    isolatedNodes.forEach(nodeId => {
      this.graph.nodes.delete(nodeId);
      this.graph.adjacencyList.delete(nodeId);
    });
    
    if (isolatedNodes.length > 0) {
      console.warn(`Removed ${isolatedNodes.length} isolated nodes`);
    }
    
    // Ensure graph connectivity
    this.ensureConnectivity();
  }

  private ensureConnectivity(): void {
    // Find connected components
    const visited = new Set<string>();
    const components: Array<Set<string>> = [];
    
    this.graph.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        const component = new Set<string>();
        this.dfs(nodeId, visited, component);
        components.push(component);
      }
    });
    
    console.log(`Found ${components.length} connected components`);
    
    // If multiple components, try to connect them
    if (components.length > 1) {
      for (let i = 0; i < components.length - 1; i++) {
        this.connectComponents(components[i], components[i + 1]);
      }
    }
  }

  private dfs(nodeId: string, visited: Set<string>, component: Set<string>): void {
    visited.add(nodeId);
    component.add(nodeId);
    
    const neighborEdges = this.graph.adjacencyList.get(nodeId) || [];
    neighborEdges.forEach(edgeId => {
        const edge = this.graph.edges.get(edgeId);
        if(!edge) return;
        const neighborId = edge.from === nodeId ? edge.to : edge.from;
        if (!visited.has(neighborId)) {
            this.dfs(neighborId, visited, component);
        }
    });
  }

  private connectComponents(comp1: Set<string>, comp2: Set<string>): void {
    let minDistance = Infinity;
    let bestPair: [string, string] | null = null;
    
    comp1.forEach(id1 => {
      comp2.forEach(id2 => {
        const node1 = this.graph.nodes.get(id1)!;
        const node2 = this.graph.nodes.get(id2)!;
        const distance = calculateDistance(node1.coordinates, node2.coordinates);
        
        if (distance < minDistance) {
          minDistance = distance;
          bestPair = [id1, id2];
        }
      });
    });
    
    if (bestPair && minDistance < 1.0) { // Connect if within 1 mile
      const [id1, id2] = bestPair;
      const walkingSpeedMph = 3.0;
      const transferTimeMinutes = (minDistance / walkingSpeedMph) * 60 + 5;
      
      this.createEdge(
        id1,
        id2,
        'CONNECTOR',
        minDistance,
        transferTimeMinutes,
        [this.graph.nodes.get(id1)!.coordinates, this.graph.nodes.get(id2)!.coordinates],
        'local'
      );
      
      console.log(`Connected components with ${minDistance.toFixed(2)} mile connector`);
    }
  }

  private getGraphStats() {
    const stats = {
      nodes: this.graph.nodes.size,
      edges: this.graph.edges.size,
      intersections: 0,
      endpoints: 0,
      stations: 0,
      transfers: 0,
      lines: new Set<string>()
    };
    
    this.graph.nodes.forEach(node => {
      if (node.type === 'intersection') stats.intersections++;
      else if (node.type === 'endpoint') stats.endpoints++;
      else if (node.type === 'station') stats.stations++;
      
      node.lines.forEach(line => stats.lines.add(line));
    });
    
    this.graph.edges.forEach(edge => {
      if (edge.line === 'TRANSFER') stats.transfers++;
    });
    
    return {
      ...stats,
      lines: stats.lines.size
    };
  }
}
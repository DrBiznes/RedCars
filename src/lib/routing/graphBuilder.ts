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
  private readonly PROXIMITY_THRESHOLD = 0.0005; // ~50 meters for station transfers
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
    
    // Check for proximity-based transfer points
    for (let i = 0; i < coords1.length; i++) {
      for (let j = 0; j < coords2.length; j++) {
        const distance = calculateDistance(coords1[i], coords2[j]);
        
        if (distance <= this.PROXIMITY_THRESHOLD && distance > this.INTERSECTION_TOLERANCE) {
          // Create a transfer point at the midpoint
          const transferPoint: [number, number] = [
            (coords1[i][0] + coords2[j][0]) / 2,
            (coords1[i][1] + coords2[j][1]) / 2
          ];
          
          this.addNodeCandidate(
            transferPoint, 
            [line1Name, line2Name], 
            'station', 
            0.8 - (distance / this.PROXIMITY_THRESHOLD) * 0.3
          );
        }
      }
    }
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
    // Sort candidates by confidence
    const sortedCandidates = Array.from(this.nodeCandidates.entries())
      .sort((a, b) => b[1].confidence - a[1].confidence);
    
    const processedKeys = new Set<string>();
    
    sortedCandidates.forEach(([key, candidate]) => {
      if (processedKeys.has(key)) return;
      
      // Find all nearby candidates to merge
      const nearbyKeys = [key];
      const mergedLines = new Set(candidate.lines);
      let bestType = candidate.type;
      
      sortedCandidates.forEach(([otherKey, otherCandidate]) => {
        if (key === otherKey || processedKeys.has(otherKey)) return;
        
        const distance = calculateDistance(candidate.coordinates, otherCandidate.coordinates);
        if (distance <= this.NODE_MERGE_RADIUS) {
          nearbyKeys.push(otherKey);
          otherCandidate.lines.forEach(line => mergedLines.add(line));
          
          // Update type priority
          if (otherCandidate.type === 'intersection' || 
              (otherCandidate.type === 'endpoint' && bestType === 'station')) {
            bestType = otherCandidate.type;
          }
        }
      });
      
      // Mark all nearby candidates as processed
      nearbyKeys.forEach(k => processedKeys.add(k));
      
      // Create the merged node
      const nodeId = `node_${this.nodeIdCounter++}`;
      const node: RouteNode = {
        id: nodeId,
        coordinates: candidate.coordinates,
        lines: Array.from(mergedLines),
        type: bestType
      };
      
      this.graph.nodes.set(nodeId, node);
      this.graph.adjacencyList.set(nodeId, []);
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
        console.warn(`Line '${lineName}' has insufficient nodes`);
        return;
      }
      
      // Create edges between consecutive nodes
      for (let i = 0; i < nodesOnLine.length - 1; i++) {
        const fromNode = nodesOnLine[i].node;
        const toNode = nodesOnLine[i + 1].node;
        
        // Extract the portion of the line between these nodes
        const edgeCoords = this.extractEdgeCoordinates(
          coordinates,
          nodesOnLine[i].position,
          nodesOnLine[i + 1].position
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
      
      // Find the closest position on the line
      let minDistance = Infinity;
      let bestPosition = 0;
      let totalDistance = 0;
      
      for (let i = 0; i < lineCoords.length - 1; i++) {
        const projection = projectPointToLine(
          node.coordinates,
          lineCoords.slice(i, i + 2)
        );
        
        if (projection.distance < minDistance) {
          minDistance = projection.distance;
          bestPosition = totalDistance + 
            calculateDistance(lineCoords[i], projection.point);
        }
        
        totalDistance += calculateDistance(lineCoords[i], lineCoords[i + 1]);
      }
      
      // Only include nodes that are actually on or very close to the line
      if (minDistance <= this.NODE_MERGE_RADIUS) {
        nodesOnLine.push({ node, position: bestPosition });
      }
    });
    
    // Sort by position along the line
    nodesOnLine.sort((a, b) => a.position - b.position);
    
    return nodesOnLine;
  }

  private extractEdgeCoordinates(
    lineCoords: [number, number][],
    startPosition: number,
    endPosition: number
  ): [number, number][] {
    const result: [number, number][] = [];
    let currentPosition = 0;
    let started = false;
    
    for (let i = 0; i < lineCoords.length - 1; i++) {
      const segmentLength = calculateDistance(lineCoords[i], lineCoords[i + 1]);
      
      if (!started && currentPosition + segmentLength >= startPosition) {
        started = true;
        result.push(lineCoords[i]);
      }
      
      if (started) {
        result.push(lineCoords[i + 1]);
        
        if (currentPosition + segmentLength >= endPosition) {
          break;
        }
      }
      
      currentPosition += segmentLength;
    }
    
    return result.length >= 2 ? result : [lineCoords[0], lineCoords[lineCoords.length - 1]];
  }

  private createTransferConnections(): void {
    const transferPairs: Array<[string, string, number]> = [];
    
    this.graph.nodes.forEach((node1, id1) => {
      if (node1.lines.length < 2) return; // Skip nodes with only one line
      
      this.graph.nodes.forEach((node2, id2) => {
        if (id1 >= id2) return; // Avoid duplicates
        
        // Check if nodes share any lines
        const sharedLines = node1.lines.filter(line => node2.lines.includes(line));
        if (sharedLines.length > 0) return; // Already connected via shared line
        
        // Check if nodes have lines that could transfer
        const distance = calculateDistance(node1.coordinates, node2.coordinates);
        if (distance <= this.PROXIMITY_THRESHOLD) {
          transferPairs.push([id1, id2, distance]);
        }
      });
    });
    
    // Create transfer edges
    transferPairs.forEach(([id1, id2, distance]) => {
      const walkingSpeedMph = 3.0;
      const transferTimeMinutes = (distance / walkingSpeedMph) * 60 + 2; // Add 2 minutes for transfer
      
      const edgeId = `transfer_${this.edgeIdCounter++}`;
      const edge: RouteEdge = {
        id: edgeId,
        from: id1,
        to: id2,
        line: 'TRANSFER',
        distance,
        travelTimeMinutes: transferTimeMinutes,
        coordinates: [
          this.graph.nodes.get(id1)!.coordinates,
          this.graph.nodes.get(id2)!.coordinates
        ],
        type: 'local'
      };
      
      this.graph.edges.set(edgeId, edge);
      this.graph.adjacencyList.get(id1)?.push(id2);
      this.graph.adjacencyList.get(id2)?.push(id1);
    });
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
    this.graph.adjacencyList.get(fromId)?.push(toId);
    this.graph.adjacencyList.get(toId)?.push(fromId);
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
    
    const neighbors = this.graph.adjacencyList.get(nodeId) || [];
    neighbors.forEach(neighborId => {
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
      
      const edgeId = `connect_${this.edgeIdCounter++}`;
      const edge: RouteEdge = {
        id: edgeId,
        from: id1,
        to: id2,
        line: 'CONNECTOR',
        distance: minDistance,
        travelTimeMinutes: transferTimeMinutes,
        coordinates: [
          this.graph.nodes.get(id1)!.coordinates,
          this.graph.nodes.get(id2)!.coordinates
        ],
        type: 'local'
      };
      
      this.graph.edges.set(edgeId, edge);
      this.graph.adjacencyList.get(id1)?.push(id2);
      this.graph.adjacencyList.get(id2)?.push(id1);
      
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
import { FeatureCollection, Feature } from 'geojson';
import { RouteGraph, RouteNode, RouteEdge } from './types';
import { 
  calculateLineDistance, 
  findLineIntersections,
  calculateDistance 
} from './geometry';
import { getLineSpeed } from './historicalData';

export class GraphBuilder {
  private graph: RouteGraph;
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;

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
    const lineFeatures = geoJsonData.features.filter(
      feature => feature.geometry.type === 'LineString'
    );

    // First pass: Create nodes for line endpoints
    this.createEndpointNodes(lineFeatures);
    
    // Second pass: Find intersections between lines
    this.findIntersections(lineFeatures);
    
    // Third pass: Create edges along each line
    this.createEdgesFromLines(lineFeatures);
    
    return this.graph;
  }

  private createEndpointNodes(lineFeatures: Feature[]): void {
    lineFeatures.forEach(feature => {
      if (feature.geometry.type !== 'LineString') return;
      
      const coordinates = feature.geometry.coordinates as [number, number][];
      const lineName = feature.properties?.Name || 'Unknown Line';
      
      // Start node
      const startCoord = coordinates[0];
      this.findOrCreateNode(startCoord, [lineName], 'endpoint');
      
      // End node  
      const endCoord = coordinates[coordinates.length - 1];
      this.findOrCreateNode(endCoord, [lineName], 'endpoint');
    });
  }

  private findIntersections(lineFeatures: Feature[]): void {
    let totalIntersections = 0;
    
    for (let i = 0; i < lineFeatures.length; i++) {
      for (let j = i + 1; j < lineFeatures.length; j++) {
        const line1 = lineFeatures[i];
        const line2 = lineFeatures[j];
        
        if (line1.geometry.type !== 'LineString' || line2.geometry.type !== 'LineString') {
          continue;
        }
        
        const coords1 = line1.geometry.coordinates as [number, number][];
        const coords2 = line2.geometry.coordinates as [number, number][];
        const line1Name = line1.properties?.Name || 'Unknown Line';
        const line2Name = line2.properties?.Name || 'Unknown Line';
        
        // Try geometric intersections first
        const geometricIntersections = findLineIntersections(coords1, coords2, 0.001);
        geometricIntersections.forEach(intersection => {
          this.findOrCreateNode(intersection, [line1Name, line2Name], 'intersection');
          totalIntersections++;
        });
        
        // Also find "near intersections" where lines pass very close to each other
        const nearIntersections = this.findNearIntersections(coords1, coords2, line1Name, line2Name);
        totalIntersections += nearIntersections;
      }
    }
    
    console.log(`Found ${totalIntersections} intersections between lines`);
  }

  /**
   * Find points where two lines pass very close to each other (within ~500m)
   * This creates virtual transfer points for the Pacific Electric system
   */
  private findNearIntersections(
    line1Coords: [number, number][],
    line2Coords: [number, number][],
    line1Name: string,
    line2Name: string
  ): number {
    let intersectionCount = 0;
    const proximityThreshold = 0.005; // ~500 meters
    
    for (const point1 of line1Coords) {
      for (const point2 of line2Coords) {
        const distance = calculateDistance(point1, point2);
        if (distance <= proximityThreshold) {
          // Use the midpoint as the intersection
          const intersectionPoint: [number, number] = [
            (point1[0] + point2[0]) / 2,
            (point1[1] + point2[1]) / 2
          ];
          
          this.findOrCreateNode(intersectionPoint, [line1Name, line2Name], 'intersection');
          intersectionCount++;
          break; // Only create one intersection per line pair in each area
        }
      }
    }
    
    return intersectionCount;
  }

  private createEdgesFromLines(lineFeatures: Feature[]): void {
    let totalEdges = 0;
    
    lineFeatures.forEach(feature => {
      if (feature.geometry.type !== 'LineString') return;
      
      const coordinates = feature.geometry.coordinates as [number, number][];
      const lineName = feature.properties?.Name || 'Unknown Line';
      const lineSpeed = getLineSpeed(lineName);
      
      // Find all nodes along this line
      const nodesOnLine = this.findNodesAlongLine(coordinates, lineName);
      
      if (nodesOnLine.length < 2) {
        console.warn(`Line '${lineName}' has only ${nodesOnLine.length} nodes - creating simplified edge`);
        // Create a single edge for the entire line if we don't have intersections
        if (nodesOnLine.length === 2) {
          const distance = calculateLineDistance(coordinates);
          const travelTimeMinutes = (distance / lineSpeed.speedMph) * 60;
          
          this.createEdge(
            nodesOnLine[0].id,
            nodesOnLine[1].id,
            lineName,
            distance,
            travelTimeMinutes,
            coordinates,
            lineSpeed.type
          );
          totalEdges++;
        }
        return;
      }
      
      // Create edges between consecutive nodes
      for (let i = 0; i < nodesOnLine.length - 1; i++) {
        const fromNode = nodesOnLine[i];
        const toNode = nodesOnLine[i + 1];
        
        const edgeCoords = this.extractEdgeCoordinates(
          coordinates, 
          fromNode.coordinates, 
          toNode.coordinates
        );
        
        const distance = calculateLineDistance(edgeCoords);
        const travelTimeMinutes = (distance / lineSpeed.speedMph) * 60;
        
        this.createEdge(
          fromNode.id,
          toNode.id,
          lineName,
          distance,
          travelTimeMinutes,
          edgeCoords,
          lineSpeed.type
        );
        totalEdges++;
      }
    });
    
    console.log(`Created ${totalEdges} edges for ${lineFeatures.length} lines`);
  }

  private findNodesAlongLine(
    lineCoords: [number, number][], 
    lineName: string
  ): RouteNode[] {
    const nodesOnLine: RouteNode[] = [];
    
    this.graph.nodes.forEach(node => {
      if (node.lines.includes(lineName)) {
        nodesOnLine.push(node);
      }
    });
    
    // Sort nodes by their position along the line
    nodesOnLine.sort((a, b) => {
      const indexA = this.findNodePositionOnLine(a.coordinates, lineCoords);
      const indexB = this.findNodePositionOnLine(b.coordinates, lineCoords);
      return indexA - indexB;
    });
    
    return nodesOnLine;
  }

  private findNodePositionOnLine(
    nodeCoord: [number, number], 
    lineCoords: [number, number][]
  ): number {
    let minDistance = Infinity;
    let bestIndex = 0;
    
    for (let i = 0; i < lineCoords.length; i++) {
      const distance = calculateDistance(nodeCoord, lineCoords[i]);
      if (distance < minDistance) {
        minDistance = distance;
        bestIndex = i;
      }
    }
    
    return bestIndex;
  }

  private extractEdgeCoordinates(
    lineCoords: [number, number][],
    startCoord: [number, number],
    endCoord: [number, number]
  ): [number, number][] {
    const startIndex = this.findNodePositionOnLine(startCoord, lineCoords);
    const endIndex = this.findNodePositionOnLine(endCoord, lineCoords);
    
    const fromIndex = Math.min(startIndex, endIndex);
    const toIndex = Math.max(startIndex, endIndex);
    
    return lineCoords.slice(fromIndex, toIndex + 1);
  }

  private findOrCreateNode(
    coordinates: [number, number], 
    lines: string[], 
    type: RouteNode['type']
  ): string {
    // Check if node already exists at this location (within tolerance)
    const tolerance = 0.002; // Increase tolerance to ~200 meters for better intersection detection
    
    for (const [nodeId, node] of this.graph.nodes) {
      const distance = calculateDistance(coordinates, node.coordinates);
      if (distance < tolerance) {
        // Merge lines
        const uniqueLines = Array.from(new Set([...node.lines, ...lines]));
        this.graph.nodes.set(nodeId, {
          ...node,
          lines: uniqueLines,
          type: node.type === 'intersection' || type === 'intersection' ? 'intersection' : type
        });
        return nodeId;
      }
    }
    
    // Create new node
    const nodeId = `node_${this.nodeIdCounter++}`;
    const node: RouteNode = {
      id: nodeId,
      coordinates,
      lines: [...lines],
      type
    };
    
    this.graph.nodes.set(nodeId, node);
    this.graph.adjacencyList.set(nodeId, []);
    
    return nodeId;
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
}
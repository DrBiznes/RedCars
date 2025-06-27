import { FeatureCollection } from 'geojson';
import { GraphBuilder } from './graphBuilder';
import { RouteFinder } from './routeFinder';
import { RouteGraph, RouteResult, RoutingOptions } from './types';

/**
 * Main Pacific Electric routing service
 * Coordinates graph building and route finding
 */
export class PacificElectricRouter {
  private graph: RouteGraph | null = null;
  private routeFinder: RouteFinder | null = null;
  private isInitialized = false;

  constructor() {}

  /**
   * Initialize the router with GeoJSON line data
   */
  async initialize(geoJsonData: FeatureCollection): Promise<void> {
    try {
      console.log('Building Pacific Electric route graph...');
      
      const graphBuilder = new GraphBuilder();
      this.graph = graphBuilder.buildFromGeoJSON(geoJsonData);
      
      this.routeFinder = new RouteFinder(this.graph);
      this.isInitialized = true;
      
      const stats = this.getNetworkStats();
      console.log(`Graph built successfully:`);
      console.log(`- ${stats?.nodeCount} nodes (${stats?.intersectionCount} intersections, ${stats?.endpointCount} endpoints)`);
      console.log(`- ${stats?.edgeCount} edges`);
      console.log(`- ${stats?.lineCount} unique lines`);
      
      // Debug: Check if we have any intersections
      if (stats && stats.intersectionCount === 0) {
        console.warn('No line intersections found! This will make routing impossible.');
      }
      
    } catch (error) {
      console.error('Failed to initialize Pacific Electric router:', error);
      throw error;
    }
  }

  /**
   * Find a route between two points
   */
  findRoute(options: RoutingOptions): RouteResult | null {
    if (!this.isInitialized || !this.routeFinder) {
      throw new Error('Router not initialized. Call initialize() first.');
    }

    try {
      return this.routeFinder.findRoute(options);
    } catch (error) {
      console.error('Route finding failed:', error);
      return null;
    }
  }

  /**
   * Find the closest Pacific Electric line to a point
   */
  findClosestLine(point: [number, number]): {
    point: [number, number],
    line: string,
    distance: number
  } | null {
    if (!this.isInitialized || !this.routeFinder) {
      console.warn('Router not initialized');
      return null;
    }

    return this.routeFinder.findClosestLinePoint(point);
  }

  /**
   * Get statistics about the route network
   */
  getNetworkStats(): {
    nodeCount: number;
    edgeCount: number;
    lineCount: number;
    lines: string[];
    intersectionCount: number;
    endpointCount: number;
  } | null {
    if (!this.graph) {
      return null;
    }

    const lines = this.getUniqueLines();
    let intersectionCount = 0;
    let endpointCount = 0;

    this.graph.nodes.forEach(node => {
      if (node.type === 'intersection') {
        intersectionCount++;
      } else if (node.type === 'endpoint') {
        endpointCount++;
      }
    });

    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      lineCount: lines.length,
      lines,
      intersectionCount,
      endpointCount
    };
  }

  /**
   * Get all unique line names in the network
   */
  private getUniqueLines(): string[] {
    if (!this.graph) return [];
    
    const lineSet = new Set<string>();
    this.graph.edges.forEach(edge => {
      lineSet.add(edge.line);
    });
    
    return Array.from(lineSet).sort();
  }

  /**
   * Check if router is ready to use
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the underlying graph (for debugging/visualization)
   */
  getGraph(): RouteGraph | null {
    return this.graph;
  }

  /**
   * Calculate straight-line distance between two points (for comparison)
   */
  static calculateDirectDistance(
    start: [number, number], 
    end: [number, number]
  ): number {
    const [lat1, lon1] = start;
    const [lat2, lon2] = end;
    
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format route result for display
   */
  static formatRouteResult(route: RouteResult): {
    summary: string;
    details: string[];
    timeFormatted: string;
    distanceFormatted: string;
  } {
    const hours = Math.floor(route.totalTimeMinutes / 60);
    const minutes = Math.round(route.totalTimeMinutes % 60);
    const timeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    const distanceFormatted = `${route.totalDistance.toFixed(1)} mi`;
    
    const summary = `${timeFormatted} • ${distanceFormatted} • ${route.transfers} transfers`;
    
    const details = route.lines.map((line, index) => {
      const segment = route.edges.filter(edge => edge.line === line);
      const segmentTime = segment.reduce((sum, edge) => sum + edge.travelTimeMinutes, 0);
      const segmentDistance = segment.reduce((sum, edge) => sum + edge.distance, 0);
      
      return `${index + 1}. ${line} (${Math.round(segmentTime)}m, ${segmentDistance.toFixed(1)}mi)`;
    });

    return {
      summary,
      details,
      timeFormatted,
      distanceFormatted
    };
  }
}
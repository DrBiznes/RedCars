import { FeatureCollection } from 'geojson';
import { GraphBuilder } from './graphBuilder';
import { RouteFinder } from './routeFinder';
import { RouteGraph, RouteResult, RoutingOptions } from './types';
import { calculateDistance } from './geometry';

/**
 * Main Pacific Electric routing service with improved algorithms
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
      console.log('Initializing Pacific Electric router with improved algorithms...');
      
      const graphBuilder = new GraphBuilder();
      this.graph = graphBuilder.buildFromGeoJSON(geoJsonData);
      
      this.routeFinder = new RouteFinder(this.graph);
      this.isInitialized = true;
      
      const stats = this.getNetworkStats();
      console.log('Router initialized successfully:', stats);
      
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
      const route = this.routeFinder.findRoute(options);
      
      if (route) {
        console.log('Route found:', PacificElectricRouter.formatRouteResult(route));
      } else {
        console.log('No route found between the selected points');
      }
      
      return route;
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
    stationCount: number;
    transferCount: number;
  } | null {
    if (!this.graph) {
      return null;
    }

    const lines = new Set<string>();
    let intersectionCount = 0;
    let endpointCount = 0;
    let stationCount = 0;
    let transferCount = 0;

    this.graph.nodes.forEach(node => {
      if (node.type === 'intersection') {
        intersectionCount++;
      } else if (node.type === 'endpoint') {
        endpointCount++;
      } else if (node.type === 'station') {
        stationCount++;
      }
      
      node.lines.forEach(line => lines.add(line));
    });
    
    this.graph.edges.forEach(edge => {
      if (edge.line === 'TRANSFER') {
        transferCount++;
      }
    });

    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      lineCount: lines.size,
      lines: Array.from(lines).sort(),
      intersectionCount,
      endpointCount,
      stationCount,
      transferCount
    };
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
   * Format route result for display
   */
  static formatRouteResult(route: RouteResult): {
    summary: string;
    details: string[];
    segments: Array<{
      line: string;
      time: number;
      distance: number;
      stops: number;
    }>;
    timeFormatted: string;
    distanceFormatted: string;
  } {
    const hours = Math.floor(route.totalTimeMinutes / 60);
    const minutes = Math.round(route.totalTimeMinutes % 60);
    const timeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
    
    const distanceFormatted = `${route.totalDistance.toFixed(1)} mi`;
    
    const transferText = route.transfers === 0 
      ? 'Direct route' 
      : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`;
    
    const summary = `${timeFormatted} • ${distanceFormatted} • ${transferText}`;
    
    // Calculate detailed segments
    const segments: Array<{
      line: string;
      time: number;
      distance: number;
      stops: number;
    }> = [];
    
    let currentLine = '';
    let segmentTime = 0;
    let segmentDistance = 0;
    let segmentStops = 0;
    
    route.edges.forEach(edge => {
      if (edge.line === 'TRANSFER') {
        // Complete current segment if exists
        if (currentLine && segmentTime > 0) {
          segments.push({
            line: currentLine,
            time: segmentTime,
            distance: segmentDistance,
            stops: segmentStops
          });
        }
        // Reset for next segment
        currentLine = '';
        segmentTime = 0;
        segmentDistance = 0;
        segmentStops = 0;
      } else if (edge.line !== currentLine) {
        // Starting new line segment
        if (currentLine && segmentTime > 0) {
          segments.push({
            line: currentLine,
            time: segmentTime,
            distance: segmentDistance,
            stops: segmentStops
          });
        }
        currentLine = edge.line;
        segmentTime = edge.travelTimeMinutes;
        segmentDistance = edge.distance;
        segmentStops = 1;
      } else {
        // Continue on same line
        segmentTime += edge.travelTimeMinutes;
        segmentDistance += edge.distance;
        segmentStops += 1;
      }
    });
    
    // Add final segment
    if (currentLine && segmentTime > 0) {
      segments.push({
        line: currentLine,
        time: segmentTime,
        distance: segmentDistance,
        stops: segmentStops
      });
    }
    
    // Format details
    const details = segments.map((segment, index) => {
      const segMinutes = Math.round(segment.time);
      const segDistance = segment.distance.toFixed(1);
      return `${index + 1}. ${segment.line}: ${segMinutes} min, ${segDistance} mi, ${segment.stops} stops`;
    });

    return {
      summary,
      details,
      segments,
      timeFormatted,
      distanceFormatted
    };
  }

  /**
   * Calculate straight-line distance between two points (for comparison)
   */
  static calculateDirectDistance(
    start: [number, number], 
    end: [number, number]
  ): number {
    return calculateDistance(start, end);
  }

  /**
   * Validate route options
   */
  static validateRoutingOptions(options: RoutingOptions): string[] {
    const errors: string[] = [];
    
    if (!options.startPoint || options.startPoint.length !== 2) {
      errors.push('Invalid start point');
    }
    
    if (!options.endPoint || options.endPoint.length !== 2) {
      errors.push('Invalid end point');
    }
    
    if (options.startPoint && options.endPoint) {
      const distance = calculateDistance(options.startPoint, options.endPoint);
      if (distance < 0.01) {
        errors.push('Start and end points are too close together');
      }
      if (distance > 100) {
        errors.push('Start and end points are too far apart (over 100 miles)');
      }
    }
    
    const validOptimizeModes = ['time', 'distance', 'transfers'];
    if (options.optimizeFor && !validOptimizeModes.includes(options.optimizeFor)) {
      errors.push(`Invalid optimization mode. Use one of: ${validOptimizeModes.join(', ')}`);
    }
    
    if (options.maxWalkingDistance && options.maxWalkingDistance > 5) {
      errors.push('Maximum walking distance is too high (limit is 5 miles)');
    }
    
    return errors;
  }
}
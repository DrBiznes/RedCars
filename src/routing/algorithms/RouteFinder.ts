import { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { Position, RouteResult, RouteSegment } from '../types/routing.types';
import { GraphBuilder } from '../graph/GraphBuilder';
import { Dijkstra } from './Dijkstra';
import { GeoUtils } from '../utils/GeoUtils';
import { SpeedData } from '../data/SpeedData';
import { Edge } from '../graph/Edge';

export class RouteFinder {
  private graphBuilder: GraphBuilder;
  private graph: any = null;
  private isInitialized = false;

  constructor() {
    this.graphBuilder = new GraphBuilder();
  }

  /**
   * Initialize the routing system with line and station data
   */
  async initialize(
    lines: Feature<LineString>[],
    historicalStations: FeatureCollection<Point> | null
  ): Promise<void> {
    this.graph = await this.graphBuilder.buildGraph(lines, historicalStations);
    this.isInitialized = true;
  }

  /**
   * Find route between two positions
   */
  findRoute(startPos: Position, endPos: Position): RouteResult | null {
    if (!this.isInitialized || !this.graph) {
      throw new Error('RouteFinder not initialized');
    }

    // Find nearest stations
    const startStation = this.graphBuilder.findNearestStation(startPos);
    const endStation = this.graphBuilder.findNearestStation(endPos);

    if (!startStation || !endStation) {
      return null;
    }

    // Find path using Dijkstra
    const dijkstra = new Dijkstra(this.graph);
    const path = dijkstra.findPath(startStation.id, endStation.id);

    if (!path || path.length === 0) {
      return null;
    }

    // Build route result
    const segments: RouteSegment[] = [];
    let totalDistance = 0;
    let totalTime = 0;
    let walkingTime = 0;
    let transitTime = 0;
    const usedLines = new Set<string>();

    // Add walking segment to start station
    const walkToStart = GeoUtils.getDistance(startPos, startStation.position);
    const walkToStartTime = SpeedData.calculateWalkingTime(walkToStart);
    
    segments.push({
      from: {
        id: 'start',
        position: startPos,
        lineNames: [],
        isIntersection: false,
        isHistorical: false
      },
      to: startStation,
      lineName: 'Walking',
      distance: walkToStart,
      time: walkToStartTime,
      isTransfer: false,
      isWalking: true
    });

    totalDistance += walkToStart;
    totalTime += walkToStartTime;
    walkingTime += walkToStartTime;

    // Add transit segments
    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = path[i];
      const toNode = path[i + 1];
      
      const edge = this.graph.nodes
        .get(fromNode.station.id)
        ?.edges.find((e: Edge) => e.to === toNode.station.id);

      if (edge) {
        // Determine which line to use for this segment
        let lineName = edge.lineNames[0];
        
        // If previous segment exists, try to stay on the same line
        if (i > 0 && segments.length > 1) {
          const prevSegment = segments[segments.length - 1];
          if (!prevSegment.isWalking) {
            const sameLine = edge.lineNames.find(line => line === prevSegment.lineName);
            if (sameLine) {
              lineName = sameLine;
            }
          }
        }

        const isTransfer = i > 0 && segments.length > 1 && 
          !segments[segments.length - 1].isWalking &&
          segments[segments.length - 1].lineName !== lineName;

        segments.push({
          from: fromNode.station,
          to: toNode.station,
          lineName,
          distance: edge.distance,
          time: edge.time + (isTransfer ? SpeedData.getTransferPenalty() : 0),
          isTransfer,
          isWalking: false
        });

        totalDistance += edge.distance;
        totalTime += edge.time + (isTransfer ? SpeedData.getTransferPenalty() : 0);
        transitTime += edge.time + (isTransfer ? SpeedData.getTransferPenalty() : 0);
        usedLines.add(lineName);
      }
    }

    // Add walking segment from end station
    const walkFromEnd = GeoUtils.getDistance(endStation.position, endPos);
    const walkFromEndTime = SpeedData.calculateWalkingTime(walkFromEnd);
    
    segments.push({
      from: endStation,
      to: {
        id: 'end',
        position: endPos,
        lineNames: [],
        isIntersection: false,
        isHistorical: false
      },
      lineName: 'Walking',
      distance: walkFromEnd,
      time: walkFromEndTime,
      isTransfer: false,
      isWalking: true
    });

    totalDistance += walkFromEnd;
    totalTime += walkFromEndTime;
    walkingTime += walkFromEndTime;

    // Count transfers
    const transfers = segments.filter(s => s.isTransfer).length;

    return {
      path: path.map(node => node.station),
      segments,
      totalDistance,
      totalTime,
      walkingTime,
      transitTime,
      transfers,
      lines: Array.from(usedLines)
    };
  }

  /**
   * Get all stations for visualization
   */
  getAllStations() {
    return this.graphBuilder.getAllStations();
  }
}
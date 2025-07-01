import { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { Station, GraphNode, RouteGraph, Position } from '../types/routing.types';
import { Edge } from './Edge';
import { GeoUtils } from '../utils/GeoUtils';
import { SpeedData } from '../data/SpeedData';
import { StationGenerator } from './StationGenerator';
import { IntersectionFinder } from './IntersectionFinder';

export class GraphBuilder {
  private stations: Station[] = [];
  private graph: RouteGraph = { nodes: new Map() };

  /**
   * Build the complete routing graph
   */
  async buildGraph(
    lines: Feature<LineString>[],
    historicalStations: FeatureCollection<Point> | null
  ): Promise<RouteGraph> {
    console.log('=== GRAPH BUILDER DEBUG ===');
    console.log('Building graph with:', lines.length, 'lines');
    
    // 1. Find all line intersections
    console.log('Finding line intersections...');
    const intersections = IntersectionFinder.findAllIntersections(lines);
    console.log('Found intersections:', intersections.length);

    // 2. Generate all stations
    console.log('Generating stations...');
    this.stations = StationGenerator.generateStations(
      lines,
      historicalStations,
      intersections
    );
    console.log('Graph builder generated:', this.stations.length, 'total stations');

    // 3. Associate stations with lines
    StationGenerator.associateStationsWithLines(this.stations, lines);

    // 4. Create graph nodes
    for (const station of this.stations) {
      this.graph.nodes.set(station.id, {
        station,
        edges: []
      });
    }

    // 5. Create edges between stations
    this.createLineEdges(lines);
    this.createTransferEdges();

    return this.graph;
  }

  /**
   * Create edges between consecutive stations on the same line
   */
  private createLineEdges(lines: Feature<LineString>[]): void {
    for (const line of lines) {
      const lineName = line.properties?.Name || 'Unknown Line';
      const lineStations = this.getStationsOnLine(lineName);
      
      // Sort stations by their position along the line
      const sortedStations = this.sortStationsAlongLine(lineStations, line);

      // Create edges between consecutive stations
      for (let i = 0; i < sortedStations.length - 1; i++) {
        const from = sortedStations[i];
        const to = sortedStations[i + 1];
        
        const distance = GeoUtils.getDistance(from.position, to.position);
        const speed = SpeedData.getLineSpeed(lineName);
        const time = SpeedData.calculateTime(distance, speed);

        // Create bidirectional edges
        this.addEdge(new Edge(
          from.id,
          to.id,
          distance,
          time,
          [lineName],
          false
        ));

        this.addEdge(new Edge(
          to.id,
          from.id,
          distance,
          time,
          [lineName],
          false
        ));
      }
    }
  }

  /**
   * Create transfer edges at stations served by multiple lines
   */
  private createTransferEdges(): void {
    for (const station of this.stations) {
      if (station.lineNames.length > 1) {
        // This is a transfer station
        // Add transfer penalty as an edge to itself (conceptually)
        // In practice, we'll add the penalty when switching lines during routing
      }
    }
  }

  /**
   * Add an edge to the graph
   */
  private addEdge(edge: Edge): void {
    const fromNode = this.graph.nodes.get(edge.from);
    if (fromNode) {
      fromNode.edges.push(edge);
    }
  }

  /**
   * Get all stations on a specific line
   */
  private getStationsOnLine(lineName: string): Station[] {
    return this.stations.filter(station => 
      station.lineNames.includes(lineName)
    );
  }

  /**
   * Sort stations along a line based on their position
   */
  private sortStationsAlongLine(
    stations: Station[],
    line: Feature<LineString>
  ): Station[] {
    const coords = line.geometry.coordinates;
    
    // Calculate cumulative distance along the line
    const cumulativeDistances: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      const dist = GeoUtils.getDistance(
        GeoUtils.coordToPosition(coords[i - 1]),
        GeoUtils.coordToPosition(coords[i])
      );
      cumulativeDistances.push(cumulativeDistances[i - 1] + dist);
    }

    // For each station, find its position along the line
    const stationDistances = stations.map(station => {
      let minDistance = Infinity;
      let bestSegmentIndex = 0;
      let bestRatio = 0;

      // Find closest segment
      for (let i = 0; i < coords.length - 1; i++) {
        const segmentStart = GeoUtils.coordToPosition(coords[i]);
        const segmentEnd = GeoUtils.coordToPosition(coords[i + 1]);
        
        const closestPoint = GeoUtils.closestPointOnLine(
          station.position,
          segmentStart,
          segmentEnd
        );

        const distance = GeoUtils.getDistance(station.position, closestPoint);
        
        if (distance < minDistance) {
          minDistance = distance;
          bestSegmentIndex = i;
          
          // Calculate ratio along segment
          const segmentLength = GeoUtils.getDistance(segmentStart, segmentEnd);
          const distanceFromStart = GeoUtils.getDistance(segmentStart, closestPoint);
          bestRatio = segmentLength > 0 ? distanceFromStart / segmentLength : 0;
        }
      }

      const distanceAlongLine = cumulativeDistances[bestSegmentIndex] + 
        bestRatio * (cumulativeDistances[bestSegmentIndex + 1] - cumulativeDistances[bestSegmentIndex]);

      return { station, distance: distanceAlongLine };
    });

    // Sort by distance along line
    stationDistances.sort((a, b) => a.distance - b.distance);
    
    return stationDistances.map(sd => sd.station);
  }

  /**
   * Find nearest station to a position
   */
  findNearestStation(position: Position): Station | null {
    let nearestStation: Station | null = null;
    let minDistance = Infinity;

    for (const station of this.stations) {
      const distance = GeoUtils.getDistance(position, station.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }

    return nearestStation;
  }

  /**
   * Get all stations (for visualization)
   */
  getAllStations(): Station[] {
    return this.stations;
  }
}
import { Feature, FeatureCollection, LineString, Point } from 'geojson';

export interface SimplePosition {
  lat: number;
  lng: number;
}

export interface SimpleStation {
  id: string;
  name?: string;
  position: SimplePosition;
  lineNames: string[];
}

export interface SimpleRoute {
  path: SimplePosition[];
  distance: number;
  estimatedTime: number;
  stations: SimpleStation[];
}

export class SimpleRouteFinder {
  // private lines: Feature<LineString>[] = []; // Will use later for complex routing
  private stations: SimpleStation[] = [];
  private isInitialized = false;

  async initialize(
    lines: Feature<LineString>[],
    historicalStations: FeatureCollection<Point> | null
  ): Promise<void> {
    console.log('Initializing simple routing...');
    
    // Store lines for future use (currently unused)
    // this.lines = lines;
    
    // Create a simple set of stations - just use historical ones for now
    if (historicalStations) {
      this.stations = historicalStations.features.slice(0, 20).map((feature, index) => ({
        id: `station-${index}`,
        name: feature.properties?.Name || `Station ${index}`,
        position: {
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0]
        },
        lineNames: ['Red Car Line'] // Simplified for now
      }));
    }

    this.isInitialized = true;
    console.log(`Simple routing initialized with ${this.stations.length} stations`);
  }

  findRoute(start: SimplePosition, end: SimplePosition): SimpleRoute | null {
    if (!this.isInitialized) {
      console.log('Routing not initialized');
      return null;
    }

    console.log('Finding route from:', start, 'to:', end);

    // Find nearest stations to start and end points
    const startStation = this.findNearestStation(start);
    const endStation = this.findNearestStation(end);

    if (!startStation || !endStation) {
      console.log('Could not find nearby stations');
      return null;
    }

    console.log('Start station:', startStation.name, 'End station:', endStation.name);

    // Create a simple straight-line route for now
    const path: SimplePosition[] = [
      start,
      startStation.position,
      endStation.position,
      end
    ];

    const distance = this.calculateDistance(start, end);
    const estimatedTime = (distance / 25) * 60; // Assume 25 mph average speed

    return {
      path,
      distance,
      estimatedTime,
      stations: [startStation, endStation]
    };
  }

  private findNearestStation(position: SimplePosition): SimpleStation | null {
    if (this.stations.length === 0) return null;

    let nearest = this.stations[0];
    let minDistance = this.calculateDistance(position, nearest.position);

    for (const station of this.stations) {
      const distance = this.calculateDistance(position, station.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }

    return nearest;
  }

  private calculateDistance(pos1: SimplePosition, pos2: SimplePosition): number {
    const R = 3959; // Earth's radius in miles
    const lat1Rad = pos1.lat * Math.PI / 180;
    const lat2Rad = pos2.lat * Math.PI / 180;
    const deltaLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const deltaLng = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  getAllStations(): SimpleStation[] {
    return this.stations;
  }
}
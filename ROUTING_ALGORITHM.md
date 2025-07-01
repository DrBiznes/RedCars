# Red Car Routing Algorithm Implementation

## Overview

This document describes the comprehensive routing algorithm implemented for the Pacific Electric Red Car historical transit map. The system provides realistic route finding between any two points using the historical Red Car network, combining real historical station data with intelligently generated virtual stations.

## Architecture

### Core Components

The routing system is built with a modular architecture consisting of several key components:

```
src/routing/
├── types/routing.types.ts      # TypeScript interfaces
├── utils/GeoUtils.ts          # Geographic calculations
├── graph/
│   ├── IntersectionFinder.ts  # Line intersection detection
│   ├── StationGenerator.ts    # Hybrid station generation
│   ├── GraphBuilder.ts        # Routing graph construction
│   ├── Node.ts               # Graph node representation
│   └── Edge.ts               # Graph edge representation
├── algorithms/
│   ├── Dijkstra.ts           # Modified Dijkstra pathfinding
│   └── RouteFinder.ts        # High-level routing API
└── data/
    ├── historical-speeds.json # Speed configuration
    └── SpeedData.ts          # Speed calculation utilities
```

## Hybrid Station Generation System

### 1. Historical Stations (28 stations)
- Loads authentic Red Car stations from `stations.geojson`
- Includes depots, major terminals, and significant stops
- Examples: Pacific Electric Building, Santa Monica Transfer Station, Long Beach Terminal
- Marked as `isHistorical: true` for visual distinction

### 2. Generated Virtual Stations
- Creates stations every **0.5 miles** along all Red Car lines
- Ensures comprehensive coverage of the entire network
- Uses geographic interpolation to place stations accurately along line segments
- Automatically associates with appropriate line names

### 3. Intersection Stations
- Automatically detects where Red Car lines cross each other
- Creates transfer stations at intersection points
- Enables realistic multi-line routing with transfers
- Marked as `isIntersection: true`

### 4. Station Deduplication
- Removes stations closer than **0.1 miles** to prevent overcrowding
- Prioritizes historical stations over generated ones
- Merges line associations for stations serving multiple lines

## Geographic Calculations

### Distance Calculation
Uses the **Haversine formula** for accurate distance calculations:
```javascript
// Earth's radius in miles
const EARTH_RADIUS_MILES = 3959;

// Calculate great circle distance between two lat/lng points
distance = EARTH_RADIUS_MILES * 2 * atan2(sqrt(a), sqrt(1-a))
```

### Line Intersection Detection
- Segments each line into coordinate pairs
- Tests all line segment combinations for intersections
- Uses computational geometry to find precise intersection points
- Deduplicates intersections within 36 feet tolerance

### Station Positioning
- **Line Association**: Links stations to lines within 0.05 miles
- **Closest Point Calculation**: Finds nearest point on line segments
- **Interpolation**: Places stations at exact distances along routes

## Routing Algorithm

### Modified Dijkstra's Algorithm

The core pathfinding uses Dijkstra's algorithm with enhancements for transit routing:

#### Key Features:
- **Time-based optimization** (not just distance)
- **Transfer penalties**: 5-minute penalty when changing lines
- **Line continuity preference**: Stays on same line when possible
- **Walking segments**: Calculates walking time to/from nearest stations

#### Speed Configuration:
```json
{
  "default": {
    "normal": 25,    // mph - standard Red Car speed
    "local": 15,     // mph - local service stops
    "express": 35    // mph - express services
  },
  "lines": {
    "Santa Monica Air Line": { "averageSpeed": 30 },
    "Long Beach Line": { "averageSpeed": 28 },
    // ... specific speeds for each line
  },
  "transferPenalty": 5,  // minutes
  "walkingSpeed": 3      // mph
}
```

#### Algorithm Steps:
1. **Find nearest stations** to start and end points
2. **Initialize graph** with all stations as nodes
3. **Apply Dijkstra's** with time-weighted edges
4. **Add transfer penalties** when switching lines
5. **Calculate walking time** for first/last mile
6. **Reconstruct optimal path** from end to start

### Route Result Structure

```typescript
interface RouteResult {
  path: Station[];           // Sequence of stations
  segments: RouteSegment[];  // Detailed route segments
  totalDistance: number;     // Total miles
  totalTime: number;         // Total minutes
  walkingTime: number;       // Walking portion
  transitTime: number;       // Transit portion
  transfers: number;         // Number of line changes
  lines: string[];          // Lines used
}
```

## Graph Construction

### Edge Creation
- **Line Edges**: Connect consecutive stations on same line
- **Bidirectional**: Allows travel in both directions
- **Time-weighted**: Uses historical speeds for each line
- **Transfer Detection**: Identifies when line changes occur

### Node Structure
```typescript
interface GraphNode {
  station: Station;
  edges: Edge[];
}
```

### Edge Properties
```typescript
interface Edge {
  from: string;        // Station ID
  to: string;          // Station ID
  distance: number;    // Miles
  time: number;        // Minutes
  lineNames: string[]; // Associated lines
  isTransfer: boolean; // Line change required
}
```

## Implementation Highlights

### Performance Optimizations
- **Lazy initialization**: Only builds graph when needed
- **Efficient data structures**: Uses Maps for O(1) lookups
- **Minimal station spacing**: 0.5-mile intervals balance accuracy and performance
- **Intersection caching**: Pre-calculates all line intersections

### Realistic Transit Modeling
- **Historical accuracy**: Uses authentic 1920s-1940s operational data
- **Transfer penalties**: Reflects real-world connection times
- **Variable speeds**: Different line types have appropriate speeds
- **Walking integration**: Calculates realistic first/last mile walking

### Debug and Monitoring
- **Comprehensive logging**: Tracks all generation and routing steps
- **Visual debug panel**: Real-time statistics display
- **Station visualization**: Toggle between historical and generated stations
- **Route visualization**: Green polylines show calculated routes

## Data Sources

### Input Files
- **`lines.geojson`**: Complete Pacific Electric route network
- **`stations.geojson`**: 28 historical Red Car stations and depots
- **`historical-speeds.json`**: Researched operational speeds by line

### File Structure
```
public/data/GeoJSON/
├── lines.geojson     # Pacific Electric route network
└── stations.geojson  # Historical stations and depots
```

## Usage

### Basic Route Finding
```typescript
const routeFinder = new RouteFinder();
await routeFinder.initialize(lines, historicalStations);

const route = routeFinder.findRoute(
  { lat: 34.0522, lng: -118.2437 },  // Downtown LA
  { lat: 34.0195, lng: -118.4912 }   // Santa Monica
);
```

### Integration with Map
- **Point placement**: Click to set start/end points
- **Route calculation**: Automatic pathfinding on demand
- **Visual feedback**: Routes displayed as green polylines
- **Station display**: Toggle historical vs. generated stations

## Technical Achievements

1. **Hybrid Station System**: Combines authentic historical data with comprehensive generated coverage
2. **Realistic Transit Modeling**: Accounts for transfers, variable speeds, and walking time
3. **Geographic Accuracy**: Uses proper spherical geometry for all calculations
4. **Performance Optimization**: Handles complex network efficiently
5. **Visual Integration**: Seamless map integration with interactive controls

## Future Enhancements

- **Time-of-day routing**: Different schedules for peak/off-peak
- **Accessibility options**: Step-free routes and accessible stations
- **Historical accuracy modes**: Different time periods (1920s vs 1940s)
- **Multi-modal integration**: Connection to other transit systems
- **Route alternatives**: Multiple route options with trade-offs

---

*This routing algorithm recreates the experience of navigating the Pacific Electric Red Car system, providing historically accurate and geographically precise route finding for this iconic Los Angeles transit network.*
/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  // Assumes all coordinates are in [longitude, latitude] format
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
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
 * Calculate distance along a LineString coordinate array
 */
export function calculateLineDistance(coordinates: [number, number][]): number {
  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += calculateDistance(coordinates[i - 1], coordinates[i]);
  }
  return totalDistance;
}

/**
 * Find the closest point on a line segment to a given point
 */
export function projectPointToLineSegment(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): { 
  point: [number, number], 
  distance: number, 
  t: number 
} {
  // Assumes all coordinates are in [longitude, latitude] format
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (dx === 0 && dy === 0) {
    return {
      point: [x1, y1],
      distance: calculateDistance(point, [x1, y1]),
      t: 0
    };
  }
  
  const t = Math.max(0, Math.min(1, 
    ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
  ));
  
  const projectedPoint: [number, number] = [
    x1 + t * dx,
    y1 + t * dy
  ];
  
  return {
    point: projectedPoint,
    distance: calculateDistance(point, projectedPoint),
    t
  };
}

/**
 * Find the closest point on a LineString to a given point
 */
export function projectPointToLine(
  point: [number, number],
  lineCoordinates: [number, number][]
): {
  point: [number, number],
  distance: number,
  segmentIndex: number,
  t: number
} {
  let closestPoint: [number, number] = lineCoordinates[0];
  let minDistance = calculateDistance(point, lineCoordinates[0]);
  let closestSegmentIndex = 0;
  let closestT = 0;
  
  for (let i = 0; i < lineCoordinates.length - 1; i++) {
    const projection = projectPointToLineSegment(
      point,
      lineCoordinates[i],
      lineCoordinates[i + 1]
    );
    
    if (projection.distance < minDistance) {
      minDistance = projection.distance;
      closestPoint = projection.point;
      closestSegmentIndex = i;
      closestT = projection.t;
    }
  }
  
  return {
    point: closestPoint,
    distance: minDistance,
    segmentIndex: closestSegmentIndex,
    t: closestT
  };
}

/**
 * Check if two line segments intersect
 */
export function linesIntersect(
  line1Start: [number, number],
  line1End: [number, number],
  line2Start: [number, number],
  line2End: [number, number],
  tolerance: number = 0.0001
): { intersects: boolean, point?: [number, number] } {
  const [x1, y1] = line1Start;
  const [x2, y2] = line1End;
  const [x3, y3] = line2Start;
  const [x4, y4] = line2End;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < tolerance) {
    return { intersects: false };
  }
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const intersectionPoint: [number, number] = [
      x1 + t * (x2 - x1),
      y1 + t * (y2 - y1)
    ];
    return { intersects: true, point: intersectionPoint };
  }
  
  return { intersects: false };
}

/**
 * Find all intersections between two LineStrings
 */
export function findLineIntersections(
  line1Coords: [number, number][],
  line2Coords: [number, number][],
  tolerance: number = 0.0001
): [number, number][] {
  const intersections: [number, number][] = [];
  
  for (let i = 0; i < line1Coords.length - 1; i++) {
    for (let j = 0; j < line2Coords.length - 1; j++) {
      const result = linesIntersect(
        line1Coords[i],
        line1Coords[i + 1],
        line2Coords[j],
        line2Coords[j + 1],
        tolerance
      );
      
      if (result.intersects && result.point) {
        intersections.push(result.point);
      }
    }
  }
  
  return intersections;
}
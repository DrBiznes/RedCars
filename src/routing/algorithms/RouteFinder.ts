
// src/routing/algorithms/RouteFinder.ts

import { Station, RouteResult, RouteSegment } from '../types/routing.types';
import { StationNode } from '../graph/Node';
import { findShortestPath } from './Dijkstra';
import { haversineDistance } from '../utils/GeoUtils';
import { getWalkingSpeed } from '../data/SpeedData';

/**
 * High-level API to find a route between two geographic coordinates.
 * @param startPosition - The starting coordinates [longitude, latitude].
 * @param endPosition - The ending coordinates [longitude, latitude].
 * @param stations - An array of all available stations.
 * @param graph - The pre-built routing graph.
 * @returns A complete RouteResult object or null if no route is found.
 */
export function findRoute(
  startPosition: [number, number],
  endPosition: [number, number],
  stations: Station[],
  graph: Map<string, StationNode>
): RouteResult | null {
  // 1. Find the nearest stations to the start and end points
  const { station: startStation, walkingTimeToStation: startWalkingTime } = findNearestStation(startPosition, stations);
  const { station: endStation, walkingTimeToStation: endWalkingTime } = findNearestStation(endPosition, stations);

  if (!startStation || !endStation) {
    return null; // Could not find a station within a reasonable distance
  }

  const startNode = graph.get(startStation.id);
  const endNode = graph.get(endStation.id);

  if (!startNode || !endNode) {
    return null; // Should not happen if stations and graph are in sync
  }

  // 2. Find the shortest path using Dijkstra's algorithm
  const pathResult = findShortestPath(startNode, endNode);

  if (!pathResult) {
    return null; // No path found between the stations
  }

  // 3. Enhance the result with detailed segment info, transfers, and walking times
  return enhanceRouteResult(pathResult, startWalkingTime, endWalkingTime);
}

function findNearestStation(
    position: [number, number], 
    stations: Station[]
  ): { station: Station | null; walkingTimeToStation: number } {
    let nearestStation: Station | null = null;
    let minDistance = Infinity;
  
    stations.forEach(station => {
      const distance = haversineDistance(position, station.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    });
  
    const walkingSpeed = getWalkingSpeed();
    const walkingTime = (minDistance / walkingSpeed) * 60; // in minutes
  
    return { station: nearestStation, walkingTimeToStation: walkingTime };
  }

function enhanceRouteResult(
  result: RouteResult,
  startWalkingTime: number,
  endWalkingTime: number
): RouteResult {
  const segments: RouteSegment[] = [];
  let totalDistance = 0;
  let transfers = 0;
  let lastLine = '';

  for (let i = 0; i < result.path.length - 1; i++) {
    const from = result.path[i];
    const to = result.path[i+1];
    // This requires a way to know the line for the segment. 
    // This information should be passed down from Dijkstra's or reconstructed.
    // For now, we'll make a placeholder assumption.
    const line = from.lines[0]; 
    if (lastLine && line !== lastLine) {
        transfers++;
    }
    const distance = haversineDistance(from.position, to.position);
    totalDistance += distance;
    segments.push({
        from,
        to,
        line,
        distance,
        time: 0 // This also needs to be calculated properly
    });
    lastLine = line;
  }

  result.segments = segments;
  result.totalDistance = totalDistance;
  result.transfers = transfers;
  result.walkingTime = startWalkingTime + endWalkingTime;
  result.totalTime += result.walkingTime;

  return result;
}

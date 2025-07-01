
// src/routing/algorithms/Dijkstra.ts

import { StationNode } from '../graph/Node';
import { RouteResult } from '../types/routing.types';
import { getTransferPenalty } from '../data/SpeedData';

/**
 * Finds the shortest path between two stations using Dijkstra's algorithm.
 * @param startNode - The starting station node.
 * @param endNode - The destination station node.
 * @returns A RouteResult object containing the path and other details, or null if no path is found.
 */
export function findShortestPath(
  startNode: StationNode,
  endNode: StationNode
): RouteResult | null {
  const distances = new Map<string, number>();
  const previousNodes = new Map<string, { node: StationNode; line: string } | null>();
  const priorityQueue = new Map<string, number>();

  // Initialize distances and priority queue
  priorityQueue.set(startNode.id, 0);

  while (priorityQueue.size > 0) {
    // Get the node with the smallest distance
    const currentNodeId = getClosestNode(priorityQueue);
    const currentTime = priorityQueue.get(currentNodeId)!;
    priorityQueue.delete(currentNodeId);

    if (currentNodeId === endNode.id) {
      // We have reached the destination
      return reconstructPath(startNode, endNode, previousNodes, distances);
    }

    const currentNode = previousNodes.has(currentNodeId) ? previousNodes.get(currentNodeId)!.node : startNode;

    currentNode.edges.forEach(edge => {
      const neighborNode = edge.to;
      let newTime = currentTime + edge.weight;

      // Add transfer penalty if changing lines
      const previousEdge = previousNodes.get(currentNode.id);
      if (previousEdge && previousEdge.line !== edge.line) {
        newTime += getTransferPenalty();
      }

      if (!distances.has(neighborNode.id) || newTime < distances.get(neighborNode.id)!) {
        distances.set(neighborNode.id, newTime);
        previousNodes.set(neighborNode.id, { node: currentNode, line: edge.line });
        priorityQueue.set(neighborNode.id, newTime);
      }
    });
  }

  return null; // No path found
}

function getClosestNode(queue: Map<string, number>): string {
    let closestNodeId = '';
    let minDistance = Infinity;
    for (const [nodeId, distance] of queue.entries()) {
        if (distance < minDistance) {
            minDistance = distance;
            closestNodeId = nodeId;
        }
    }
    return closestNodeId;
}

function reconstructPath(
    startNode: StationNode, 
    endNode: StationNode, 
    previousNodes: Map<string, { node: StationNode; line: string } | null>,
    distances: Map<string, number>
  ): RouteResult {
    const path: StationNode[] = [];
    let currentNode: StationNode | null = endNode;
    let currentId = endNode.id;
  
    while (currentId !== startNode.id && previousNodes.has(currentId)) {
      const prev = previousNodes.get(currentId)!;
      path.unshift(currentNode!);
      currentNode = prev.node;
      currentId = prev.node.id;
    }
    path.unshift(startNode);
  
    // ... more details to be filled in RouteFinder ...
    return {
      path: path.map(n => n.station),
      totalTime: distances.get(endNode.id) || 0,
      totalDistance: 0, // To be calculated
      segments: [], // To be calculated
      transfers: 0, // To be calculated
      walkingTime: 0, // To be calculated
    };
  }

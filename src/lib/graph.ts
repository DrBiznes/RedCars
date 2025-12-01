import { FeatureCollection, LineString, Position } from 'geojson';
import * as turf from '@turf/turf';
import { calculateTravelTimeMinutes, DEFAULT_SPEED_MPH, TRANSFER_PENALTY_MINUTES } from './geoUtils';

export interface Node {
    id: string;
    position: Position;
    lineId?: string; // If this node belongs to a specific line
    isTransfer?: boolean;
}

export interface Edge {
    from: string;
    to: string;
    weight: number; // Time in minutes
    distance: number; // Miles
    lineId?: string;
    geometry?: Position[]; // Coordinates for the path
}

export interface RouteResult {
    path: Position[];
    totalTime: number;
    segments: {
        from: Position;
        to: Position;
        lineId?: string;
        time: number;
        distance: number;
        instructions: string;
    }[];
}

export class Graph {
    nodes: Map<string, Node> = new Map();
    edges: Map<string, Edge[]> = new Map();

    addNode(node: Node) {
        if (!this.nodes.has(node.id)) {
            this.nodes.set(node.id, node);
            this.edges.set(node.id, []);
        }
    }

    addEdge(edge: Edge) {
        if (isNaN(edge.weight) || edge.weight < 0) {
            console.error(`Invalid edge weight: ${edge.weight}`, edge);
            return;
        }
        if (!this.edges.has(edge.from)) {
            this.edges.set(edge.from, []);
        }
        this.edges.get(edge.from)?.push(edge);
    }

    /**
     * Builds the graph from a collection of LineStrings.
     * Nodes are created at the start, end, and at regular intervals along each line.
     * Edges are created between sequential nodes on the same line.
     * Transfer edges are created between nodes of different lines that are within a certain distance.
     * 
     * @param lines - The GeoJSON FeatureCollection of LineStrings representing the transit lines.
     */

    buildGraphWithTransfers(lines: FeatureCollection<LineString>) {
        this.nodes.clear();
        this.edges.clear();

        const lineFeatures = lines.features;

        // Helper to get a unique node ID for a point on a line
        const getNodeID = (lineIdx: number, dist: number) => `line-${lineIdx}-dist-${dist.toFixed(4)}`;

        // Process each line
        lineFeatures.forEach((line, lineIdx) => {
            const coords = line.geometry.coordinates;
            const lineId = line.properties?.Name || `line-${lineIdx}`;
            const lineLength = turf.length(line, { units: 'miles' });

            // Points of interest on this line: Start, End, and Densified Points
            const pointsOnLine: { position: Position, dist: number }[] = [];

            // 1. Add Start and End
            pointsOnLine.push({ position: coords[0], dist: 0 });
            pointsOnLine.push({ position: coords[coords.length - 1], dist: lineLength });

            // 2. Densify: Add points every 0.25 miles (approx 1320 feet)
            const segmentLength = 0.25;
            for (let d = segmentLength; d < lineLength; d += segmentLength) {
                const point = turf.along(line, d, { units: 'miles' });
                pointsOnLine.push({ position: point.geometry.coordinates, dist: d });
            }

            // Sort points by distance
            pointsOnLine.sort((a, b) => a.dist - b.dist);

            // Create Nodes and Edges along the line
            for (let i = 0; i < pointsOnLine.length; i++) {
                const p = pointsOnLine[i];
                const nodeId = getNodeID(lineIdx, p.dist);

                // Add Node
                this.addNode({
                    id: nodeId,
                    position: p.position,
                    lineId: lineId
                });

                // Link to previous node on the same line
                if (i > 0) {
                    const prev = pointsOnLine[i - 1];
                    const prevId = getNodeID(lineIdx, prev.dist);
                    const dist = p.dist - prev.dist;

                    // Skip if distance is negligible (duplicate points)
                    if (dist < 0.0001) continue;

                    const time = calculateTravelTimeMinutes(dist, DEFAULT_SPEED_MPH);

                    // Get geometry for this segment
                    const segment = turf.lineSlice(turf.point(prev.position), turf.point(p.position), line);

                    this.addEdge({ from: prevId, to: nodeId, weight: time, distance: dist, lineId, geometry: segment.geometry.coordinates });
                    this.addEdge({ from: nodeId, to: prevId, weight: time, distance: dist, lineId, geometry: segment.geometry.coordinates.slice().reverse() });
                }
            }
        });

        // 3. Create Transfer Edges based on Proximity
        // Iterate through all nodes and find pairs on DIFFERENT lines that are close
        const TRANSFER_DISTANCE_MILES = 0.25; // Tightened to 0.25 miles for better accuracy
        const nodesArray = Array.from(this.nodes.values());
        let transferEdgesCount = 0;

        // This is O(N^2) which is fine for ~3000 nodes. 
        // For larger graphs, use a spatial index (RBush).
        for (let i = 0; i < nodesArray.length; i++) {
            for (let j = i + 1; j < nodesArray.length; j++) {
                const nodeA = nodesArray[i];
                const nodeB = nodesArray[j];

                // Only link nodes from different lines
                if (nodeA.lineId === nodeB.lineId) continue;

                const dist = turf.distance(turf.point(nodeA.position), turf.point(nodeB.position), { units: 'miles' });

                if (dist <= TRANSFER_DISTANCE_MILES) {
                    // Add bidirectional transfer edge
                    // Weight is transfer penalty + walking time
                    const walkTime = calculateTravelTimeMinutes(dist, 3); // 3 mph walking speed
                    const totalWeight = TRANSFER_PENALTY_MINUTES + walkTime;

                    this.addEdge({ from: nodeA.id, to: nodeB.id, weight: totalWeight, distance: dist });
                    this.addEdge({ from: nodeB.id, to: nodeA.id, weight: totalWeight, distance: dist });
                    transferEdgesCount++;
                }
            }
        }
        console.log(`Graph built: ${this.nodes.size} nodes, ${this.edges.size} edges. Added ${transferEdgesCount} transfer edges.`);
    }

    analyzeConnectivity() {
        const visited = new Set<string>();
        const components: string[][] = [];

        this.nodes.forEach((_, nodeId) => {
            if (!visited.has(nodeId)) {
                const component: string[] = [];
                const stack = [nodeId];
                visited.add(nodeId);

                while (stack.length > 0) {
                    const curr = stack.pop()!;
                    component.push(curr);

                    const neighbors = this.edges.get(curr) || [];
                    for (const edge of neighbors) {
                        if (!visited.has(edge.to)) {
                            visited.add(edge.to);
                            stack.push(edge.to);
                        }
                    }
                }
                components.push(component);
            }
        });

        console.log(`Graph Connectivity Analysis:`);
        console.log(`Total Nodes: ${this.nodes.size}`);
        console.log(`Connected Components: ${components.length}`);
        components.sort((a, b) => b.length - a.length);
        components.forEach((comp, idx) => {
            console.log(`Component ${idx + 1}: ${comp.length} nodes`);
            if (idx < 5 && comp.length < 10) {
                // Print sample nodes for small components to debug
                console.log(`  Sample nodes: ${comp.slice(0, 3).join(', ')}`);
            }
        });
    }

    findNearestNode(point: Position): string | null {
        let minDist = Infinity;
        let nearestNodeId: string | null = null;
        const targetPoint = turf.point(point);

        this.nodes.forEach((node, id) => {
            const dist = turf.distance(targetPoint, turf.point(node.position), { units: 'miles' });
            if (dist < minDist) {
                minDist = dist;
                nearestNodeId = id;
            }
        });

        return nearestNodeId;
    }

    intersectionMap: Map<number, string[]> = new Map();

    dijkstra(startNodeId: string, endNodeId: string): RouteResult | null {
        const distances = new Map<string, number>();
        const previous = new Map<string, { edge: Edge, fromNode: string }>();
        const pq = new Set<string>();

        this.nodes.forEach((_, id) => {
            distances.set(id, Infinity);
            pq.add(id);
        });

        distances.set(startNodeId, 0);

        while (pq.size > 0) {
            // Find min distance node
            let minNode: string | null = null;
            let minDist = Infinity;

            for (const nodeId of pq) {
                const d = distances.get(nodeId) ?? Infinity;
                if (d < minDist) {
                    minDist = d;
                    minNode = nodeId;
                }
            }

            if (minNode === null || minDist === Infinity) break;
            if (minNode === endNodeId) break;

            pq.delete(minNode);

            const neighbors = this.edges.get(minNode) || [];
            for (const edge of neighbors) {
                if (!pq.has(edge.to)) continue;

                const newDist = minDist + edge.weight;
                if (newDist < (distances.get(edge.to) ?? Infinity)) {
                    distances.set(edge.to, newDist);
                    previous.set(edge.to, { edge, fromNode: minNode });
                }
            }
        }

        if (distances.get(endNodeId) === Infinity) {
            console.warn(`Dijkstra failed: End node ${endNodeId} is unreachable from ${startNodeId}.`);
            return null;
        }

        // Reconstruct path
        const path: Position[] = [];
        const segments: RouteResult['segments'] = [];
        let curr = endNodeId;

        // Backtrack
        const stack: { edge: Edge, fromNode: string }[] = [];
        while (curr !== startNodeId) {
            const prev = previous.get(curr);
            if (!prev) break;
            stack.push(prev);
            curr = prev.fromNode;
        }
        stack.reverse();

        let totalTime = 0;
        let totalDist = 0;

        stack.forEach(item => {
            const { edge } = item;
            totalTime += edge.weight;
            totalDist += edge.distance;

            if (edge.geometry) {
                // If it's a travel edge
                path.push(...edge.geometry);
                segments.push({
                    from: this.nodes.get(edge.from)!.position,
                    to: this.nodes.get(edge.to)!.position,
                    lineId: edge.lineId,
                    time: edge.weight,
                    distance: edge.distance,
                    instructions: `Travel on ${edge.lineId}`
                });
            } else {
                // Transfer edge
                segments.push({
                    from: this.nodes.get(edge.from)!.position,
                    to: this.nodes.get(edge.to)!.position,
                    time: edge.weight,
                    distance: 0,
                    instructions: `Transfer`
                });
            }
        });

        return {
            path, // Note: this might have duplicate points at segment joins, can clean up
            totalTime,
            segments
        };
    }
}

/**
 * Helper to consolidate adjacent segments that belong to the same line.
 */
export function consolidateSegments(segments: RouteResult['segments']): RouteResult['segments'] {
    if (segments.length === 0) return [];

    const consolidated: RouteResult['segments'] = [];
    let current = { ...segments[0] };

    for (let i = 1; i < segments.length; i++) {
        const next = segments[i];

        // Check if we can merge
        // We merge if:
        // 1. Both have the same lineId (and it's defined)
        // 2. OR both are transfers (lineId undefined)
        // AND instructions are similar enough (usually "Travel on X" or "Transfer")

        const sameLine = current.lineId === next.lineId;
        const bothTransfer = !current.lineId && !next.lineId;

        if (sameLine || bothTransfer) {
            // Merge
            current.time += next.time;
            current.distance += next.distance;
            current.to = next.to; // Update end position
            // instructions stay as the first one's usually, or we could generalize
        } else {
            // Push current and start new
            consolidated.push(current);
            current = { ...next };
        }
    }
    consolidated.push(current);

    return consolidated;
}

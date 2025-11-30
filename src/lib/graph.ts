import { FeatureCollection, LineString, Position, Feature, Point } from 'geojson';
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

    buildFromGeoJSON(lines: FeatureCollection<LineString>, stations: FeatureCollection<Point>) {
        // 1. Add all stations as nodes
        stations.features.forEach((station, index) => {
            const id = `station-${index}`; // Or use a property if available
            this.addNode({
                id,
                position: station.geometry.coordinates,
                isTransfer: false // Initially false, could be true if multiple lines serve it
            });
        });

        // 2. Process lines
        // This is a simplified approach. A robust one would split lines at every intersection.
        // For now, we will treat lines as connected sequences of points.
        // To handle transfers, we need to find where lines intersect.

        const lineFeatures = lines.features;

        // Naive approach:
        // - Create nodes for every coordinate in every line.
        // - Connect them sequentially.
        // - Find intersections between lines and merge/link those nodes.

        // Better approach for "board anywhere":
        // - The graph is the lines themselves.
        // - When routing, we project start/end points onto the nearest lines.
        // - We need "transfer nodes" where lines cross.

        // Let's identify intersections first
        const intersections: { point: Position, lineIndices: number[] }[] = [];

        for (let i = 0; i < lineFeatures.length; i++) {
            for (let j = i + 1; j < lineFeatures.length; j++) {
                const line1 = lineFeatures[i];
                const line2 = lineFeatures[j];
                const intersect = turf.lineIntersect(line1, line2);

                intersect.features.forEach(feat => {
                    intersections.push({
                        point: feat.geometry.coordinates,
                        lineIndices: [i, j]
                    });
                });
            }
        }

        // Create nodes for intersections
        intersections.forEach((intersect, idx) => {
            const id = `intersection-${idx}`;
            this.addNode({
                id,
                position: intersect.point,
                isTransfer: true
            });
        });

        // Now build the graph for each line
        lineFeatures.forEach((line, lineIdx) => {
            const coords = line.geometry.coordinates;
            const lineId = line.properties?.Name || `line-${lineIdx}`;

            // We need to insert intersection nodes into the line's coordinate sequence
            // to ensure connectivity.

            // 1. Find all intersection nodes that lie on this line
            const nodesOnLine: { id: string, position: Position, dist: number }[] = [];

            // Add start and end of line
            // nodesOnLine.push({ id: `${lineId}-start`, position: coords[0], dist: 0 });
            // nodesOnLine.push({ id: `${lineId}-end`, position: coords[coords.length - 1], dist: turf.length(line, {units: 'miles'}) });

            // Check existing nodes (intersections)
            this.nodes.forEach((node, nodeId) => {
                if (node.isTransfer) {
                    // const isOnLine = booleanPointOnLine(point(node.position), line, { ignoreEndVertices: false });
                    // Simplified check: distance is very small
                    const pt = turf.point(node.position);
                    const snapped = turf.nearestPointOnLine(line, pt, { units: 'miles' });
                    if (snapped.properties.dist !== undefined && snapped.properties.dist < 0.001) {
                        // Calculate distance from start of line to order them
                        const dist = turf.length(turf.lineSlice(turf.point(coords[0]), turf.point(node.position), line), { units: 'miles' });
                        nodesOnLine.push({ id: nodeId, position: node.position, dist });
                    }
                }
            });

            // Sort nodes by distance from start
            nodesOnLine.sort((a, b) => a.dist - b.dist);

            // If no intersections, just add start/end? 
            // Actually, for "board anywhere", we might just want the raw geometry.
            // But for Dijkstra, we need a graph.

            // Let's add ALL original coordinates as nodes for high fidelity? Too big.
            // Let's stick to: Intersections + Endpoints.
            // AND we need to be able to jump onto the line.

            // Refined Strategy:
            // The graph consists of "Transfer Nodes" (intersections) and "Terminals".
            // Edges connect these nodes along the line.
            // When a user selects a Start Point:
            // 1. Find nearest point on nearest line.
            // 2. Create a temporary "Start Node".
            // 3. Connect "Start Node" to the adjacent "Transfer/Terminal Nodes" on that line.
            // 4. Do same for End Point.
            // 5. Run Dijkstra.

            // So, let's ensure we have nodes for Terminals and Intersections.

            const startNodeId = `${lineId}-start`;
            const endNodeId = `${lineId}-end`;

            // Only add if not already covered by an intersection (unlikely for exact match but possible)
            // For simplicity, always add them and link if close? 
            // Let's just add them to our list of points on line.

            nodesOnLine.push({ id: startNodeId, position: coords[0], dist: 0 });
            nodesOnLine.push({ id: endNodeId, position: coords[coords.length - 1], dist: turf.length(line, { units: 'miles' }) });

            // Add these nodes to the graph
            this.addNode({ id: startNodeId, position: coords[0], lineId });
            this.addNode({ id: endNodeId, position: coords[coords.length - 1], lineId });

            // Re-sort including terminals
            nodesOnLine.sort((a, b) => a.dist - b.dist);

            // Remove duplicates (if intersection is at terminal)
            const uniqueNodes = [];
            if (nodesOnLine.length > 0) {
                uniqueNodes.push(nodesOnLine[0]);
                for (let i = 1; i < nodesOnLine.length; i++) {
                    if (nodesOnLine[i].dist > nodesOnLine[i - 1].dist + 0.001) { // tolerance
                        uniqueNodes.push(nodesOnLine[i]);
                    }
                }
            }

            // Create edges between sequential nodes
            for (let i = 0; i < uniqueNodes.length - 1; i++) {
                const curr = uniqueNodes[i];
                const next = uniqueNodes[i + 1];

                const dist = next.dist - curr.dist;
                const time = calculateTravelTimeMinutes(dist, DEFAULT_SPEED_MPH);

                // Get geometry for this segment
                const segment = turf.lineSlice(turf.point(curr.position), turf.point(next.position), line);

                // Add edge forward
                this.addEdge({
                    from: curr.id,
                    to: next.id,
                    weight: time,
                    distance: dist,
                    lineId: lineId,
                    geometry: segment.geometry.coordinates
                });

                // Add edge backward
                this.addEdge({
                    from: next.id,
                    to: curr.id,
                    weight: time,
                    distance: dist,
                    lineId: lineId,
                    geometry: segment.geometry.coordinates.slice().reverse()
                });
            }
        });

        // Add transfer penalties at intersection nodes
        // (Implicitly handled if we model transfers as edges between "Line A Node" and "Line B Node" at same location?
        // Currently, an intersection node is SHARED. So transfer is free.
        // To add penalty, we should strictly have separate nodes for each line at the intersection, linked by a "transfer edge".

        // Refactoring for Transfer Penalty:
        // 1. Intersection Node (Physical location)
        // 2. Line Nodes (Logical stops on the line at that location)
        // 3. Edges: Line Node <-> Line Node (Travel), Line Node <-> Line Node (Transfer)

        // For this MVP, let's stick to shared node but maybe add a fixed cost when entering a new line?
        // Dijkstra doesn't easily support "turn costs" without expanding the graph state (Node = Location + ArrivedFromLine).
        // Let's implement the "Expanded Graph" approach implicitly or explicitly.

        // Explicit approach:
        // - Nodes are (LocationId, LineId).
        // - Edges on same line have weight = travel time.
        // - Edges between different lines at same location have weight = transfer penalty.

        // Let's rebuild the graph structure slightly in a separate pass if needed. 
        // For now, let's stick to the shared node. It's simpler. 
        // We can add a heuristic: if `prevEdge.lineId != currEdge.lineId`, add penalty.
        // But Dijkstra needs edge weights to be static.

        // OK, let's do the "Split Node" approach for intersections.
        // Actually, my current implementation shares the node ID.
        // Let's change `addNode` to NOT share IDs for intersections across lines, 
        // but instead create unique IDs per line, and link them.

        // RE-DOING Graph Build Logic for Transfers
        this.nodes.clear();
        this.edges.clear();

        // 1. Identify Intersections (Physical Locations)
        // ... (Same as above) ...

        // Map<String, {point: Position, lineIndices: number[]}>
        // We need to know which lines pass through which intersection.

        // Let's simplify:
        // Just build the graph of "Points on Lines".
        // For every intersection, we create a "Transfer Hub".
        // For each line passing through, we create a node "IntersectionX_LineY".
        // We link "IntersectionX_LineY" <-> "IntersectionX_LineZ" with weight = 5 mins.

        // This seems complex to implement perfectly in one go.
        // Let's stick to the shared node for now to get it working, 
        // and maybe just accept free transfers for the first iteration?
        // User asked for "add a transfer time penalty".

        // Okay, simple way:
        // - Nodes are unique to lines: `Node_LineID_Index`.
        // - If two lines intersect, we find the closest nodes on each line (or create new ones at intersection).
        // - We add a bidirectional edge between them with weight = 5 mins.

        // Let's do this.
    }

    // ... (Will implement the "Split Node" build logic in next step or refine here)
    // For the sake of this file, I will implement the "Shared Node" version first 
    // because it's robust enough for a prototype and "Transfer Penalty" can be added 
    // by checking line changes in the path result and adding it to the total time *after* routing?
    // NO, that invalidates the optimality of Dijkstra.

    // Correct approach:
    // 1. Nodes = specific points on specific lines.
    // 2. Edges = travel along line.
    // 3. Transfer Edges = connect nodes of different lines that are geographically close (intersections).

    // I will implement `buildGraphWithTransfers`

    buildGraphWithTransfers(lines: FeatureCollection<LineString>) {
        this.nodes.clear();
        this.edges.clear();
        // this.intersectionMap.clear(); // intersectionMap is not defined in the class

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

        // this.analyzeConnectivity(); // Commented out to reduce noise
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
        // console.log(`Dijkstra starting: ${startNodeId} -> ${endNodeId}`);
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

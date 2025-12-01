import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import MapGL, { Source, Layer, Marker, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FeatureCollection, LineString } from 'geojson';
import { Graph, RouteResult } from '@/lib/graph';
import { calculateDistanceMiles, calculateTravelTimeMinutes, WALKING_SPEED_MPH } from '@/lib/geoUtils';
import type { MapMouseEvent, ViewStateChangeEvent } from 'react-map-gl/mapbox';

// Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE = import.meta.env.VITE_MAPBOX_STYLE_URL;

interface MapProps {
    // No props needed for now
}

// Global window interface update for map controls
declare global {
    interface Window {
        mapControls?: {
            startPlacingStart: () => void;
            startPlacingEnd: () => void;
            zoomIn: () => void;
            zoomOut: () => void;
            resetView: () => void;
            flyTo: (lat: number, lng: number, zoom?: number) => void;
            setStartLocation: (lat: number, lng: number) => void;
            setEndLocation: (lat: number, lng: number) => void;
        };
    }
}

const Map = ({ }: MapProps) => {
    // Los Angeles coordinates
    const defaultPosition = {
        latitude: 33.942,
        longitude: -118.158,
        zoom: 8.84
    };

    const [viewState, setViewState] = useState(defaultPosition);
    const [startPosition, setStartPosition] = useState<[number, number] | null>(null);
    const [endPosition, setEndPosition] = useState<[number, number] | null>(null);
    const [isPlacingStart, setIsPlacingStart] = useState(false);
    const [isPlacingEnd, setIsPlacingEnd] = useState(false);
    const [geoJsonData, setGeoJsonData] = useState<FeatureCollection<LineString> | null>(null);
    // const [stationsData, setStationsData] = useState<FeatureCollection<Point> | null>(null);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

    // Graph instance
    const graph = useMemo(() => new Graph(), []);

    // Reference to the Mapbox map instance
    const mapRef = useRef<MapRef | null>(null);

    // Fetch GeoJSON data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [linesRes, stationsRes] = await Promise.all([
                    fetch('/src/data/GeoJSON/lines.geojson'),
                    fetch('/src/data/GeoJSON/stations.geojson')
                ]);

                if (!linesRes.ok || !stationsRes.ok) {
                    throw new Error('Failed to fetch GeoJSON data');
                }

                const linesData = await linesRes.json();
                // const stationsData = await stationsRes.json(); // Not used, but fetched for completeness if needed later

                setGeoJsonData(linesData);
                // setStationsData(stationsData); // Not used

                // Build graph
                console.log('Building graph...');
                graph.buildGraphWithTransfers(linesData);
                console.log('Graph built:', graph.nodes.size, 'nodes', graph.edges.size, 'edges');

            } catch (err) {
                console.error('Error loading GeoJSON data:', err);
            }
        };

        fetchData();
    }, [graph]);

    // Track if the update came from a search or manual interaction
    const shouldFitBoundsRef = useRef(false);
    // Track if we previously had a complete route
    const wasRouteCompleteRef = useRef(false);

    // Calculate route when start/end change
    useEffect(() => {
        if (startPosition && endPosition && geoJsonData) {
            console.log('Calculating route...');

            // 1. Find nearest points on lines for start/end
            // We need to iterate all lines to find the absolute closest point
            const startNodeId = graph.findNearestNode([startPosition[1], startPosition[0]]);
            const endNodeId = graph.findNearestNode([endPosition[1], endPosition[0]]);


            if (startNodeId && endNodeId) {
                const railRoute = graph.dijkstra(startNodeId, endNodeId);

                if (railRoute) {
                    // Calculate walking segments
                    const startNode = graph.nodes.get(startNodeId)!;
                    const endNode = graph.nodes.get(endNodeId)!;

                    const startWalkDist = calculateDistanceMiles(startPosition, [startNode.position[1], startNode.position[0]]);
                    const endWalkDist = calculateDistanceMiles([endNode.position[1], endNode.position[0]], endPosition);

                    const startWalkTime = calculateTravelTimeMinutes(startWalkDist, WALKING_SPEED_MPH);
                    const endWalkTime = calculateTravelTimeMinutes(endWalkDist, WALKING_SPEED_MPH);

                    // Construct full result
                    const fullResult: RouteResult = {
                        path: [
                            [startPosition[1], startPosition[0]], // Start Marker
                            ...railRoute.path,
                            [endPosition[1], endPosition[0]] // End Marker
                        ],
                        totalTime: startWalkTime + railRoute.totalTime + endWalkTime,
                        segments: [
                            {
                                from: [startPosition[1], startPosition[0]],
                                to: startNode.position,
                                time: startWalkTime,
                                distance: startWalkDist,
                                instructions: `Walk to ${startNode.lineId || 'Station'}`
                            },
                            ...railRoute.segments,
                            {
                                from: endNode.position,
                                to: [endPosition[1], endPosition[0]],
                                time: endWalkTime,
                                distance: endWalkDist,
                                instructions: `Walk to Destination`
                            }
                        ]
                    };

                    setRouteResult(fullResult);
                    console.log('Route calculated:', fullResult);
                    window.dispatchEvent(new CustomEvent('route-calculated', { detail: fullResult }));
                }
            }
        } else {
            setRouteResult(null);
            window.dispatchEvent(new CustomEvent('route-calculated', { detail: null }));
        }
    }, [startPosition, endPosition, geoJsonData, graph]);


    // These functions will be exposed to parent components
    const startPlacingStart = useCallback(() => {
        setIsPlacingStart(true);
        setIsPlacingEnd(false);
    }, []);

    const startPlacingEnd = useCallback(() => {
        setIsPlacingEnd(true);
        setIsPlacingStart(false);
    }, []);

    const handleMapClick = useCallback((event: MapMouseEvent) => {
        const { lng, lat } = event.lngLat;
        shouldFitBoundsRef.current = false; // Manual placement -> don't force fit bounds unless it's new route
        if (isPlacingStart) {
            setStartPosition([lat, lng]);
            setIsPlacingStart(false);
        } else if (isPlacingEnd) {
            setEndPosition([lat, lng]);
            setIsPlacingEnd(false);
        }
    }, [isPlacingStart, isPlacingEnd]);

    // Map control functions
    const zoomIn = useCallback(() => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    }, []);

    const zoomOut = useCallback(() => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    }, []);

    const resetView = useCallback(() => {
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [defaultPosition.longitude, defaultPosition.latitude],
                zoom: defaultPosition.zoom
            });
        }
    }, [defaultPosition]);

    const flyTo = useCallback((lat: number, lng: number, zoom: number = 14) => {
        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom });
        }
    }, []);

    const setStartLocation = useCallback((lat: number, lng: number) => {
        shouldFitBoundsRef.current = true; // Search -> force fit bounds
        setStartPosition([lat, lng]);
        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }
    }, []);

    const setEndLocation = useCallback((lat: number, lng: number) => {
        shouldFitBoundsRef.current = true; // Search -> force fit bounds
        setEndPosition([lat, lng]);
        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }
    }, []);

    // Auto-zoom logic
    useEffect(() => {
        const isRouteComplete = !!(startPosition && endPosition);

        if (isRouteComplete && mapRef.current) {
            // We fit bounds if:
            // 1. It's explicitly requested (e.g. from search)
            // 2. OR the route just became complete (transition from partial to full)
            if (shouldFitBoundsRef.current || !wasRouteCompleteRef.current) {

                let minLng = Math.min(startPosition[1], endPosition[1]);
                let maxLng = Math.max(startPosition[1], endPosition[1]);
                let minLat = Math.min(startPosition[0], endPosition[0]);
                let maxLat = Math.max(startPosition[0], endPosition[0]);

                // If we have a route result, use its path to get the true bounding box
                // This ensures the whole route is visible, not just the start/end box
                if (routeResult && routeResult.path.length > 0) {
                    routeResult.path.forEach(point => {
                        const [lng, lat] = point;
                        minLng = Math.min(minLng, lng);
                        maxLng = Math.max(maxLng, lng);
                        minLat = Math.min(minLat, lat);
                        maxLat = Math.max(maxLat, lat);
                    });
                }

                mapRef.current.fitBounds(
                    [[minLng, minLat], [maxLng, maxLat]],
                    {
                        padding: { top: 100, bottom: 100, left: 450, right: 100 }
                    }
                );

                // Reset flag
                shouldFitBoundsRef.current = false;
            }
        }

        // Update history
        wasRouteCompleteRef.current = isRouteComplete;
    }, [startPosition, endPosition, routeResult]);

    // Expose methods to parent via window object
    useEffect(() => {
        window.mapControls = {
            startPlacingStart,
            startPlacingEnd,
            zoomIn,
            zoomOut,
            resetView,
            flyTo,
            setStartLocation,
            setEndLocation
        };

        // Cleanup on unmount
        return () => {
            window.mapControls = undefined;
        };
    }, [startPlacingStart, startPlacingEnd, zoomIn, zoomOut, resetView, flyTo, setStartLocation, setEndLocation]);

    // Route GeoJSON
    const routeGeoJson = useMemo(() => {
        if (!routeResult) return null;
        return {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: routeResult.path
            }
        };
    }, [routeResult]);

    return (
        <div className="h-full w-full relative">
            <MapGL
                ref={mapRef}
                {...viewState}
                onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle={MAPBOX_STYLE}
                mapboxAccessToken={MAPBOX_TOKEN}
                onClick={handleMapClick}
                attributionControl={true}
            >
                {/* Lines Layer */}
                {geoJsonData && (
                    <Source id="pe-lines" type="geojson" data={geoJsonData}>
                        <Layer
                            id="pe-lines-layer"
                            type="line"
                            paint={{
                                'line-color': '#ff0000', // var(--red-car-line) approximation
                                'line-width': 4,
                                'line-opacity': 0.8
                            }}
                        />
                    </Source>
                )}

                {/* Route Layer */}
                {routeGeoJson && (
                    <Source id="route" type="geojson" data={routeGeoJson as any}>
                        <Layer
                            id="route-layer"
                            type="line"
                            paint={{
                                'line-color': '#0000ff',
                                'line-width': 6,
                                'line-opacity': 0.7
                            }}
                        />
                    </Source>
                )}

                {/* Markers */}
                {startPosition && (
                    <Marker longitude={startPosition[1]} latitude={startPosition[0]} anchor="bottom">
                        <MapPin className="h-10 w-10 text-green-600 fill-green-600/20 drop-shadow-lg" />
                    </Marker>
                )}

                {endPosition && (
                    <Marker longitude={endPosition[1]} latitude={endPosition[0]} anchor="bottom">
                        <MapPin className="h-10 w-10 text-red-600 fill-red-600/20 drop-shadow-lg" />
                    </Marker>
                )}

                {/* Stations (optional, if we want to show them) */}
                {/* 
                {stationsData && (
                    <Source id="stations" type="geojson" data={stationsData}>
                        <Layer
                            id="stations-layer"
                            type="circle"
                            paint={{
                                'circle-radius': 4,
                                'circle-color': '#fff',
                                'circle-stroke-width': 1,
                                'circle-stroke-color': '#000'
                            }}
                        />
                    </Source>
                )} 
                */}

            </MapGL>

            {isPlacingStart && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background p-2 rounded-md border border-border shadow-md z-[1000]">
                    Click on the map to place your starting point
                </div>
            )}

            {isPlacingEnd && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background p-2 rounded-md border border-border shadow-md z-[1000]">
                    Click on the map to place your destination
                </div>
            )}
        </div>
    );
};

export default Map;
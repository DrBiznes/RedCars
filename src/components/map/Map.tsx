import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { Graph, RouteResult } from '@/lib/graph';
import { calculateDistanceMiles, calculateTravelTimeMinutes, WALKING_SPEED_MPH } from '@/lib/geoUtils';

// Fix for default Leaflet marker icon in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icons
const startIcon = new L.Icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'start-marker' // We'll add CSS to colorize this
});

const endIcon = new L.Icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'end-marker' // We'll add CSS to colorize this
});

interface MapEventHandlerProps {
    isPlacingStart: boolean;
    isPlacingEnd: boolean;
    onStartPlaced: (position: [number, number]) => void;
    onEndPlaced: (position: [number, number]) => void;
}

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
        };
    }
}

// MapEventHandler component to handle click events
const MapEventHandler = ({
    isPlacingStart,
    isPlacingEnd,
    onStartPlaced,
    onEndPlaced
}: MapEventHandlerProps) => {
    // We need this variable for the hook, but don't use it directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const map = useMapEvents({
        click(e) {
            if (isPlacingStart) {
                onStartPlaced([e.latlng.lat, e.latlng.lng]);
            } else if (isPlacingEnd) {
                onEndPlaced([e.latlng.lat, e.latlng.lng]);
            }
        }
    });

    return null;
};

// Controller for zoom and reset
const MapController = ({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) => {
    const map = useMap();

    useEffect(() => {
        if (mapRef) {
            mapRef.current = map;
        }
    }, [map, mapRef]);

    return null;
};

const Map = ({ }: MapProps) => {
    // Los Angeles coordinates
    const defaultPosition: [number, number] = [34.0522, -118.2437];
    const defaultZoom = 10;

    const [startPosition, setStartPosition] = useState<[number, number] | null>(null);
    const [endPosition, setEndPosition] = useState<[number, number] | null>(null);
    const [isPlacingStart, setIsPlacingStart] = useState(false);
    const [isPlacingEnd, setIsPlacingEnd] = useState(false);
    const [geoJsonData, setGeoJsonData] = useState<FeatureCollection<LineString> | null>(null);
    const [stationsData, setStationsData] = useState<FeatureCollection<Point> | null>(null);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

    // Graph instance
    const graph = useMemo(() => new Graph(), []);

    // Reference to the Leaflet map instance
    const mapRef = useRef<L.Map | null>(null);

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
                const stationsData = await stationsRes.json();

                setGeoJsonData(linesData);
                setStationsData(stationsData);

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

    const handleStartPlaced = useCallback((position: [number, number]) => {
        setStartPosition(position);
        setIsPlacingStart(false);
    }, []);

    const handleEndPlaced = useCallback((position: [number, number]) => {
        setEndPosition(position);
        setIsPlacingEnd(false);
    }, []);

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
            mapRef.current.setView(defaultPosition, defaultZoom);
        }
    }, []);

    // GeoJSON styling - fix by defining it as a function that returns the style function
    const getStyleFunction = useCallback(() => {
        // This function returns the actual style function that GeoJSON component will use
        return (feature?: Feature<any, any>) => {
            if (!feature || !feature.properties) {
                return {
                    color: 'var(--red-car-line)',
                    weight: 0,
                    opacity: 0
                };
            }

            const isLocalLine = feature.properties.description &&
                typeof feature.properties.description === 'string' &&
                feature.properties.description.includes('Local');

            return {
                color: 'var(--red-car-line)',
                weight: 4,
                opacity: 0.8,
                dashArray: isLocalLine ? '5, 5' : undefined
            };
        };
    }, []);

    // GeoJSON popup and events
    const onEachFeature = useCallback((feature: Feature, layer: L.Layer) => {
        if (feature.properties) {
            const lineName = feature.properties.Name as string | undefined;
            const description = feature.properties.description as string | undefined;

            if (lineName) {
                const popupContent = `
                    <div>
                        <h3>${lineName}</h3>
                        ${description ? `<p>${description}</p>` : ''}
                    </div>
                `;
                layer.bindPopup(popupContent);
            }
        }
    }, []);

    // Expose methods to parent via window object
    useEffect(() => {
        window.mapControls = {
            startPlacingStart,
            startPlacingEnd,
            zoomIn,
            zoomOut,
            resetView
        };

        // Cleanup on unmount
        return () => {
            window.mapControls = undefined;
        };
    }, [startPlacingStart, startPlacingEnd, zoomIn, zoomOut, resetView]);

    return (
        <div className="h-full w-full relative">
            <MapContainer
                center={defaultPosition}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} // Hide default zoom control
                attributionControl={true} // Keep attribution but we'll style it
                className="leaflet-container-custom" // Add custom class for styling
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {geoJsonData && (
                    <GeoJSON
                        data={geoJsonData}
                        style={getStyleFunction()}
                        onEachFeature={onEachFeature}
                    />
                )}

                <MapEventHandler
                    isPlacingStart={isPlacingStart}
                    isPlacingEnd={isPlacingEnd}
                    onStartPlaced={handleStartPlaced}
                    onEndPlaced={handleEndPlaced}
                />

                <MapController mapRef={mapRef} />

                {startPosition && (
                    <Marker position={startPosition} icon={startIcon} />
                )}

                {endPosition && (
                    <Marker position={endPosition} icon={endIcon} />
                )}

                {routeResult && (
                    <Polyline
                        positions={routeResult.path.map(p => [p[1], p[0]])}
                        pathOptions={{ color: 'blue', weight: 6, opacity: 0.7 }}
                    />
                )}
            </MapContainer>

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
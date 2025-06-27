import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, GeoJSON, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Feature, FeatureCollection } from 'geojson';
import { PacificElectricRouter, RouteResult } from '@/lib/routing';

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
    selectedLines?: string[];
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
            findRoute: () => void;
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
    useMapEvents({
        click(e) {
            if (isPlacingStart) {
                // Convert to GeoJSON format [longitude, latitude] for consistency
                onStartPlaced([e.latlng.lng, e.latlng.lat]);
            } else if (isPlacingEnd) {
                // Convert to GeoJSON format [longitude, latitude] for consistency
                onEndPlaced([e.latlng.lng, e.latlng.lat]);
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

const Map = ({ selectedLines = [] }: MapProps) => {
    // Los Angeles coordinates
    const defaultPosition: [number, number] = [34.0522, -118.2437];
    const defaultZoom = 10;

    const [startPosition, setStartPosition] = useState<[number, number] | null>(null);
    const [endPosition, setEndPosition] = useState<[number, number] | null>(null);
    const [isPlacingStart, setIsPlacingStart] = useState(false);
    const [isPlacingEnd, setIsPlacingEnd] = useState(false);
    const [showAllLines, setShowAllLines] = useState(selectedLines.length === 0);
    const [activeLines, setActiveLines] = useState<string[]>(selectedLines);
    const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
    const [currentRoute, setCurrentRoute] = useState<RouteResult | null>(null);
    const [router, setRouter] = useState<PacificElectricRouter | null>(null);
    const [isRouterReady, setIsRouterReady] = useState(false);
    const [routeError, setRouteError] = useState<string | null>(null);

    // Reference to the Leaflet map instance
    const mapRef = useRef<L.Map | null>(null);

    // Fetch GeoJSON data and initialize router
    useEffect(() => {
        const initializeRouting = async () => {
            try {
                const response = await fetch('/src/data/GeoJSON/lines.geojson');
                if (!response.ok) {
                    throw new Error(`Failed to fetch GeoJSON data: ${response.status}`);
                }
                const data = await response.json();
                setGeoJsonData(data);
                
                // Initialize router
                const newRouter = new PacificElectricRouter();
                await newRouter.initialize(data);
                setRouter(newRouter);
                setIsRouterReady(true);
                
            } catch (err) {
                console.error('Error loading GeoJSON data or initializing router:', err);
                setRouteError('Failed to initialize Pacific Electric network');
            }
        };

        initializeRouting();
    }, []);

    // Update active lines when selectedLines prop changes
    useEffect(() => {
        setActiveLines(selectedLines);
        setShowAllLines(selectedLines.length === 0);
    }, [selectedLines]);

    // These functions will be exposed to parent components
    const startPlacingStart = useCallback(() => {
        setIsPlacingStart(true);
        setIsPlacingEnd(false);
        setRouteError(null);
    }, []);

    const startPlacingEnd = useCallback(() => {
        setIsPlacingEnd(true);
        setIsPlacingStart(false);
        setRouteError(null);
    }, []);

    const handleStartPlaced = useCallback((position: [number, number]) => {
        setStartPosition(position);
        setIsPlacingStart(false);
        console.log('Start marker placed at:', position);
    }, []);

    const handleEndPlaced = useCallback((position: [number, number]) => {
        setEndPosition(position);
        setIsPlacingEnd(false);
        console.log('End marker placed at:', position);
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

    // Route finding function
    const findRoute = useCallback(() => {
        if (!router || !isRouterReady) {
            setRouteError('Router not ready. Please wait...');
            return;
        }
        
        if (!startPosition || !endPosition) {
            setRouteError('Please place both start and end markers on the map');
            return;
        }

        try {
            setRouteError(null);
            console.log('Finding route from', startPosition, 'to', endPosition);
            
            // Validate options
            const validationErrors = PacificElectricRouter.validateRoutingOptions({
                startPoint: startPosition,
                endPoint: endPosition,
                optimizeFor: 'time'
            });
            
            if (validationErrors.length > 0) {
                setRouteError(validationErrors.join('. '));
                return;
            }
            
            const routeResult = router.findRoute({
                startPoint: startPosition,
                endPoint: endPosition,
                optimizeFor: 'time',
                maxWalkingDistance: 1.0 // 1 mile max walking distance
            });

            if (routeResult) {
                setCurrentRoute(routeResult);
                const formatted = PacificElectricRouter.formatRouteResult(routeResult);
                console.log('Route found:', formatted);
                
                // Fit map to show the entire route
                if (mapRef.current && routeResult.edges.length > 0) {
                    const bounds = L.latLngBounds([]);
                    routeResult.edges.forEach(edge => {
                        edge.coordinates.forEach(coord => {
                            bounds.extend([coord[1], coord[0]]);
                        });
                    });
                    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                }
            } else {
                setRouteError('No route found. Try placing markers closer to Pacific Electric lines (shown in red).');
                setCurrentRoute(null);
            }
        } catch (error) {
            console.error('Error finding route:', error);
            setRouteError('An error occurred while finding the route');
            setCurrentRoute(null);
        }
    }, [startPosition, endPosition, router, isRouterReady]);

    // Auto-find route when both points are set
    useEffect(() => {
        if (startPosition && endPosition && isRouterReady) {
            findRoute();
        } else {
            setCurrentRoute(null);
        }
    }, [startPosition, endPosition, isRouterReady, findRoute]);

    const handleLineClick = useCallback((lineName: string) => {
        // Toggle the line in the active lines array
        if (activeLines.includes(lineName)) {
            setActiveLines(activeLines.filter(name => name !== lineName));
        } else {
            setActiveLines([...activeLines, lineName]);
        }
        
        // If we're selecting a specific line, turn off "show all lines"
        if (showAllLines) {
            setShowAllLines(false);
        }
    }, [activeLines, showAllLines]);

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
            
            const lineName = feature.properties.Name as string | undefined;
            
            const isActive = 
                showAllLines || 
                (lineName && activeLines.includes(lineName));
            
            const isLocalLine = feature.properties.description && 
                typeof feature.properties.description === 'string' && 
                feature.properties.description.includes('Local');
            
            return {
                color: 'var(--red-car-line)',
                weight: isActive ? 4 : 0,
                opacity: isActive ? 0.8 : 0,
                dashArray: isLocalLine ? '5, 5' : undefined
            };
        };
    }, [showAllLines, activeLines]);

    // GeoJSON popup and events
    const onEachFeature = useCallback((feature: Feature, layer: L.Layer) => {
        if (feature.properties) {
            const lineName = feature.properties.Name as string | undefined;
            const description = feature.properties.description as string | undefined;
            
            if (lineName) {
                const popupContent = `
                    <div>
                        <h3 style="margin: 0 0 8px 0; font-weight: bold;">${lineName}</h3>
                        ${description ? `<p style="margin: 0; font-size: 14px;">${description}</p>` : ''}
                    </div>
                `;
                layer.bindPopup(popupContent);
                
                layer.on('click', () => {
                    handleLineClick(lineName);
                });
            }
        }
    }, [handleLineClick]);

    // Expose methods to parent via window object
    useEffect(() => {
        window.mapControls = {
            startPlacingStart,
            startPlacingEnd,
            zoomIn,
            zoomOut,
            resetView,
            findRoute
        };

        // Cleanup on unmount
        return () => {
            window.mapControls = undefined;
        };
    }, [startPlacingStart, startPlacingEnd, zoomIn, zoomOut, resetView, findRoute]);

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
                    <Marker position={[startPosition[1], startPosition[0]]} icon={startIcon} />
                )}

                {endPosition && (
                    <Marker position={[endPosition[1], endPosition[0]]} icon={endIcon} />
                )}

                {/* Route visualization */}
                {currentRoute && currentRoute.edges.map((edge, index) => {
                    // Convert coordinates for Leaflet (expects [lat, lng])
                    const positions = edge.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
                    
                    return (
                        <Polyline
                            key={`route-${index}`}
                            positions={positions}
                            color={edge.line === 'TRANSFER' ? '#666666' : '#ff4444'}
                            weight={6}
                            opacity={0.8}
                            dashArray={edge.line === 'TRANSFER' ? '5, 10' : undefined}
                        />
                    );
                })}
            </MapContainer>

            {isPlacingStart && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background p-3 rounded-md border border-border shadow-md z-[1000]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Click on the map to place your starting point
                    </div>
                </div>
            )}

            {isPlacingEnd && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background p-3 rounded-md border border-border shadow-md z-[1000]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        Click on the map to place your destination
                    </div>
                </div>
            )}

            {/* Error display */}
            {routeError && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-destructive/90 text-white p-3 rounded-md shadow-md z-[1000] max-w-md">
                    <div className="flex items-start gap-2">
                        <span className="text-lg">⚠</span>
                        <div className="text-sm">{routeError}</div>
                    </div>
                </div>
            )}

            {/* Route result display */}
            {currentRoute && (
                <div className="absolute bottom-20 left-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border shadow-lg z-[1000] max-w-md">
                    <h3 className="font-semibold text-base mb-3 text-red-car-red">Pacific Electric Route</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Travel Time:</span>
                            <span className="font-medium">
                                {PacificElectricRouter.formatRouteResult(currentRoute).timeFormatted}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Distance:</span>
                            <span className="font-medium">
                                {PacificElectricRouter.formatRouteResult(currentRoute).distanceFormatted}
                            </span>
                        </div>
                        {currentRoute.transfers > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Transfers:</span>
                                <span className="font-medium text-amber-600">
                                    {currentRoute.transfers}
                                </span>
                            </div>
                        )}
                        <div className="pt-2 border-t border-border">
                            <div className="text-sm font-medium mb-1">Route:</div>
                            <div className="text-xs text-muted-foreground">
                                {currentRoute.lines.join(' → ')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Router status */}
            {!isRouterReady && geoJsonData && !routeError && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-sm p-6 rounded-lg border border-border shadow-lg z-[1000]">
                    <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                        <div className="text-sm font-medium">Initializing Pacific Electric network...</div>
                        <div className="text-xs text-muted-foreground mt-1">This may take a few seconds</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Map;
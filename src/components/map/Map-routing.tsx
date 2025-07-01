import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, GeoJSON, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Feature, FeatureCollection } from 'geojson';
import { RouteFinder } from '@/routing/algorithms/RouteFinder';
import { RouteResult, Station } from '@/routing/types/routing.types';

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
            calculateRoute: () => void;
            clearRoute: () => void;
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
    const [stationsGeoJsonData, setStationsGeoJsonData] = useState<FeatureCollection | null>(null);
    
    // Routing state
    const [routeFinder] = useState(() => new RouteFinder());
    const [isRoutingInitialized, setIsRoutingInitialized] = useState(false);
    const [currentRoute, setCurrentRoute] = useState<RouteResult | null>(null);
    const [showStations, setShowStations] = useState(false);
    const [allStations, setAllStations] = useState<Station[]>([]);

    // Reference to the Leaflet map instance
    const mapRef = useRef<L.Map | null>(null);

    // Fetch GeoJSON data
    useEffect(() => {
        const fetchGeoJsonData = async () => {
            try {
                // Fetch lines
                const linesResponse = await fetch('/src/data/GeoJSON/lines.geojson');
                if (!linesResponse.ok) {
                    throw new Error(`Failed to fetch lines GeoJSON data: ${linesResponse.status}`);
                }
                const linesData = await linesResponse.json();
                setGeoJsonData(linesData);

                // Fetch stations
                const stationsResponse = await fetch('/src/data/GeoJSON/stations.geojson');
                if (stationsResponse.ok) {
                    const stationsData = await stationsResponse.json();
                    setStationsGeoJsonData(stationsData);
                }
            } catch (err) {
                console.error('Error loading GeoJSON data:', err);
            }
        };

        fetchGeoJsonData();
    }, []);

    // Initialize routing when data is loaded
    useEffect(() => {
        const initializeRouting = async () => {
            if (geoJsonData && !isRoutingInitialized) {
                try {
                    await routeFinder.initialize(
                        geoJsonData.features as any,
                        stationsGeoJsonData
                    );
                    setIsRoutingInitialized(true);
                    setAllStations(routeFinder.getAllStations());
                } catch (err) {
                    console.error('Error initializing routing:', err);
                }
            }
        };

        initializeRouting();
    }, [geoJsonData, stationsGeoJsonData, isRoutingInitialized, routeFinder]);

    // Update active lines when selectedLines prop changes
    useEffect(() => {
        setActiveLines(selectedLines);
        setShowAllLines(selectedLines.length === 0);
    }, [selectedLines]);

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

    const calculateRoute = useCallback(() => {
        if (!isRoutingInitialized || !startPosition || !endPosition) {
            console.log('Cannot calculate route: missing data');
            return;
        }

        const route = routeFinder.findRoute(
            { lat: startPosition[0], lng: startPosition[1] },
            { lat: endPosition[0], lng: endPosition[1] }
        );

        if (route) {
            setCurrentRoute(route);
            console.log('Route found:', route);
        } else {
            console.log('No route found');
        }
    }, [isRoutingInitialized, startPosition, endPosition, routeFinder]);

    const clearRoute = useCallback(() => {
        setCurrentRoute(null);
        setStartPosition(null);
        setEndPosition(null);
    }, []);

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
                        <h3>${lineName}</h3>
                        ${description ? `<p>${description}</p>` : ''}
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
            calculateRoute,
            clearRoute
        };

        return () => {
            window.mapControls = undefined;
        };
    }, [startPlacingStart, startPlacingEnd, zoomIn, zoomOut, resetView, calculateRoute, clearRoute]);

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

                {/* Render stations */}
                {showStations && allStations.map(station => (
                    <CircleMarker
                        key={station.id}
                        center={[station.position.lat, station.position.lng]}
                        radius={station.isHistorical ? 6 : 4}
                        fillColor={station.isHistorical ? '#FF5722' : '#2196F3'}
                        fillOpacity={0.8}
                        weight={1}
                        color="#000"
                    >
                        <L.Popup>
                            <div>
                                <strong>{station.name || station.id}</strong>
                                {station.lineNames.length > 0 && (
                                    <p>Lines: {station.lineNames.join(', ')}</p>
                                )}
                                {station.isIntersection && <p><em>Transfer Station</em></p>}
                                {station.isHistorical && <p><em>Historical Station</em></p>}
                            </div>
                        </L.Popup>
                    </CircleMarker>
                ))}

                {/* Render route */}
                {currentRoute && (
                    <Polyline 
                        positions={currentRoute.segments.map(segment => [
                            [segment.from.position.lat, segment.from.position.lng],
                            [segment.to.position.lat, segment.to.position.lng]
                        ]).flat()}
                        color="#4CAF50"
                        weight={6}
                        opacity={0.8}
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

            {/* Debug toggle for stations */}
            <button
                onClick={() => setShowStations(!showStations)}
                className="absolute top-4 right-4 z-[1000] bg-white px-3 py-1 rounded shadow text-sm"
            >
                {showStations ? 'Hide' : 'Show'} Stations
            </button>
        </div>
    );
};

export default Map;
import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

// Custom marker icons (assuming CSS defines .start-marker and .end-marker filters/styles)
const startIcon = new L.Icon({
    iconUrl: icon, // Using default icon, colorized via CSS
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'start-marker'
});

const endIcon = new L.Icon({
    iconUrl: icon, // Using default icon, colorized via CSS
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'end-marker'
});

interface MapEventHandlerProps {
    isPlacingStart: boolean;
    isPlacingEnd: boolean;
    onStartPlaced: (position: [number, number]) => void;
    onEndPlaced: (position: [number, number]) => void;
}

// MapEventHandler component to handle click events
const MapEventHandler = ({
                             isPlacingStart,
                             isPlacingEnd,
                             onStartPlaced,
                             onEndPlaced
                         }: MapEventHandlerProps) => {
    // Prefix 'map' with '_' because it's required by the hook but not used directly
    const _map = useMapEvents({
        click(e) {
            if (isPlacingStart) {
                onStartPlaced([e.latlng.lat, e.latlng.lng]);
            } else if (isPlacingEnd) {
                onEndPlaced([e.latlng.lat, e.latlng.lng]);
            }
        }
    });

    // This component doesn't render anything itself
    return null;
};

// Controller to get map instance for zoom/reset controls
const MapController = ({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) => {
    const map = useMap(); // Get the map instance from the context

    // Assign the map instance to the ref passed from the parent
    useEffect(() => {
        if (mapRef) {
            mapRef.current = map;
        }
        // Clean up ref on unmount if necessary, though usually not required
        // return () => { mapRef.current = null; };
    }, [map, mapRef]);

    // This component doesn't render anything itself
    return null;
};

const Map = () => {
    // Los Angeles coordinates
    const defaultPosition: L.LatLngTuple = [34.0522, -118.2437]; // Use L.LatLngTuple for type safety
    const defaultZoom = 10;

    const [startPosition, setStartPosition] = useState<L.LatLngTuple | null>(null);
    const [endPosition, setEndPosition] = useState<L.LatLngTuple | null>(null);
    const [isPlacingStart, setIsPlacingStart] = useState(false);
    const [isPlacingEnd, setIsPlacingEnd] = useState(false);

    // Reference to the Leaflet map instance
    const mapRef = useRef<L.Map | null>(null);

    // Callback to initiate placing the start marker
    const startPlacingStart = useCallback(() => {
        console.log("Initiating start marker placement"); // Debug log
        setIsPlacingStart(true);
        setIsPlacingEnd(false);
        // Optionally change cursor style
        if (mapRef.current?.getContainer()) {
            mapRef.current.getContainer().style.cursor = 'crosshair';
        }
    }, []);

    // Callback to initiate placing the end marker
    const startPlacingEnd = useCallback(() => {
        console.log("Initiating end marker placement"); // Debug log
        setIsPlacingEnd(true);
        setIsPlacingStart(false);
        // Optionally change cursor style
        if (mapRef.current?.getContainer()) {
            mapRef.current.getContainer().style.cursor = 'crosshair';
        }
    }, []);

    // Callback when the start marker position is determined (map clicked)
    const handleStartPlaced = useCallback((position: L.LatLngTuple) => {
        console.log("Start marker placed at:", position); // Debug log
        setStartPosition(position);
        setIsPlacingStart(false);
        // Reset cursor style
        if (mapRef.current?.getContainer()) {
            mapRef.current.getContainer().style.cursor = '';
        }
    }, []);

    // Callback when the end marker position is determined (map clicked)
    const handleEndPlaced = useCallback((position: L.LatLngTuple) => {
        console.log("End marker placed at:", position); // Debug log
        setEndPosition(position);
        setIsPlacingEnd(false);
        // Reset cursor style
        if (mapRef.current?.getContainer()) {
            mapRef.current.getContainer().style.cursor = '';
        }
    }, []);

    // Map control functions using the mapRef
    const zoomIn = useCallback(() => {
        mapRef.current?.zoomIn();
    }, []);

    const zoomOut = useCallback(() => {
        mapRef.current?.zoomOut();
    }, []);

    const resetView = useCallback(() => {
        mapRef.current?.setView(defaultPosition, defaultZoom);
    }, [defaultPosition, defaultZoom]); // Include dependencies

    // Expose control methods to parent/other components via the window object
    // Ensure this effect runs only once or when the control functions change
    useEffect(() => {
        console.log("Registering map controls on window");
        // Assign functions to window.mapControls
        // Type safety relies on the declaration in vite-env.d.ts
        window.mapControls = {
            startPlacingStart,
            startPlacingEnd,
            zoomIn,
            zoomOut,
            resetView
        };

        // Cleanup function to remove the global property when the component unmounts
        return () => {
            console.log("Unregistering map controls from window");
            // Check if it's the same object before deleting to avoid conflicts if multiple maps exist
            if (window.mapControls &&
                window.mapControls.startPlacingStart === startPlacingStart) {
                window.mapControls = undefined; // Or delete window.mapControls;
            }
        };
        // Rerun effect if any control function identity changes (due to useCallback dependencies)
    }, [startPlacingStart, startPlacingEnd, zoomIn, zoomOut, resetView]);

    return (
        <div className="h-full w-full relative">
            {/* Display user feedback when placing markers */}
            {(isPlacingStart || isPlacingEnd) && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background p-2 rounded-md border border-border shadow-md z-[1000] text-sm pointer-events-none">
                    {isPlacingStart
                        ? "Click on the map to place your starting point"
                        : "Click on the map to place your destination"}
                </div>
            )}

            <MapContainer
                center={defaultPosition}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} // Disable default zoom controls (using custom ones)
                attributionControl={true} // Keep OpenStreetMap attribution
                className="leaflet-container-custom" // Custom class for potential styling
                // Assign the ref via the 'ref' prop is not standard for react-leaflet MapContainer
                // Instead, use a component inside like MapController to get the instance
            >
                {/* Component to get map instance */}
                <MapController mapRef={mapRef} />

                <TileLayer
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Component to handle map click events for marker placement */}
                <MapEventHandler
                    isPlacingStart={isPlacingStart}
                    isPlacingEnd={isPlacingEnd}
                    onStartPlaced={handleStartPlaced}
                    onEndPlaced={handleEndPlaced}
                />

                {/* Display the start marker if its position is set */}
                {startPosition && (
                    <Marker position={startPosition} icon={startIcon}>
                        {/* Optional: Add Popup or Tooltip */}
                        {/* <Popup>Starting Point</Popup> */}
                    </Marker>
                )}

                {/* Display the end marker if its position is set */}
                {endPosition && (
                    <Marker position={endPosition} icon={endIcon}>
                        {/* Optional: Add Popup or Tooltip */}
                        {/* <Popup>Destination</Popup> */}
                    </Marker>
                )}

                {/* Placeholder for Red Car routes and stops layers */}
                {/* Example: <GeoJSON data={redCarRoutesGeoJson} style={{ color: 'red' }} /> */}
                {/* Example: <LayerGroup>{redCarStopMarkers}</LayerGroup> */}

            </MapContainer>
        </div>
    );
};

export default Map;
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const Map = () => {
    // Los Angeles coordinates
    const position: [number, number] = [34.0522, -118.2437];

    return (
        <div className="h-full w-full">
            <MapContainer
                center={position}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Red Car routes and stops will go here */}
            </MapContainer>
        </div>
    );
};

export default Map;
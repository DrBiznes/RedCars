
// src/components/routing/RouteDisplay.tsx

import React from 'react';
import { Polyline } from 'react-leaflet';
import { RouteResult } from '../../routing/types/routing.types';

interface RouteDisplayProps {
  route: RouteResult | null;
}

const RouteDisplay: React.FC<RouteDisplayProps> = ({ route }) => {
  if (!route) {
    return null;
  }

  const routeCoordinates = route.path.map(station => [station.position[1], station.position[0]] as [number, number]);

  return (
    <Polyline 
      positions={routeCoordinates} 
      color="#ff0000" // A bright color to make the route visible
      weight={5}
    />
  );
};

export default RouteDisplay;

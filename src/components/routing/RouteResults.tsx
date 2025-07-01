
// src/components/routing/RouteResults.tsx

import React from 'react';
import { RouteResult } from '../../routing/types/routing.types';

interface RouteResultsProps {
  route: RouteResult | null;
  loading: boolean;
}

const RouteResults: React.FC<RouteResultsProps> = ({ route, loading }) => {
  if (loading) {
    return <div>Calculating route...</div>;
  }

  if (!route) {
    return <div>No route found.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Route Details</h2>
      <p><strong>Total Time:</strong> {route.totalTime.toFixed(2)} minutes</p>
      <p><strong>Total Distance:</strong> {route.totalDistance.toFixed(2)} miles</p>
      <p><strong>Transfers:</strong> {route.transfers}</p>
      <p><strong>Walking Time:</strong> {route.walkingTime.toFixed(2)} minutes</p>
      
      <h3 className="text-md font-bold mt-4 mb-2">Segments</h3>
      <ul>
        {route.segments.map((segment, index) => (
          <li key={index} className="mb-1">
            <strong>{segment.line}:</strong> {segment.from.name} to {segment.to.name} ({segment.distance.toFixed(2)} mi)
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RouteResults;

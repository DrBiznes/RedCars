import { useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Feature, FeatureCollection } from 'geojson';

interface PELinesLayerProps {
  showAllLines?: boolean;
  activeLines?: string[];
  onLineClick?: (lineName: string) => void;
}

const PELinesLayer = ({ showAllLines = true, activeLines = [], onLineClick }: PELinesLayerProps) => {
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useMap();

  useEffect(() => {
    const fetchGeoJsonData = async () => {
      try {
        const response = await fetch('/src/data/GeoJSON/lines.geojson');
        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON data: ${response.status}`);
        }
        const data = await response.json();
        setGeoJsonData(data);
      } catch (err) {
        console.error('Error loading GeoJSON data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error loading GeoJSON data');
      }
    };

    fetchGeoJsonData();
  }, []);

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
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
          if (onLineClick) {
            onLineClick(lineName);
          }
        });
      }
    }
  };

  // Create a function that returns the style function
  const getStyleFunction = () => {
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
  };

  if (error) {
    return <div className="error-message">Error loading PE lines: {error}</div>;
  }

  if (!geoJsonData) {
    return null;
  }

  return (
    <GeoJSON 
      data={geoJsonData} 
      style={getStyleFunction()}
      onEachFeature={onEachFeature}
    />
  );
};

export default PELinesLayer;
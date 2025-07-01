import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from "@/components/sidebar/Sidebar";
import Map from "@/components/map/Map";
import MapDock from "@/components/map/MapDock";
import { RouteResult } from '../../routing/types/routing.types';

// Update the window interface to match window.mapControls
declare global {
  interface Window {
    mapControls?: {
      startPlacingStart: () => void;
      startPlacingEnd: () => void;
      calculateRoute: () => void;
      zoomIn: () => void;
      zoomOut: () => void;
      resetView: () => void;
    };
  }
}

// Define our own interface for the map controls
interface MapControls {
  startPlacingStart: () => void;
  startPlacingEnd: () => void;
  calculateRoute: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface LayoutProps {
    sidebarContent: React.ReactNode;
    onRouteCalculated: (route: RouteResult | null) => void;
    onCalculating: (status: boolean) => void;
    route: RouteResult | null;
    isCalculating: boolean;
    children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebarContent, onRouteCalculated, onCalculating, route, isCalculating }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [mapControls, setMapControls] = useState<MapControls | null>(null);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('results');

  // Use effect to get the map controls once they're registered
  useEffect(() => {
    const checkForMapControls = () => {
      if (window.mapControls) {
        setMapControls(window.mapControls);
      } else {
        // Try again in a moment if not available yet
        setTimeout(checkForMapControls, 500);
      }
    };

    checkForMapControls();

    return () => {
      // Clean up if needed
    };
  }, []);

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  const handleStartMarkerSelect = () => {
    if (mapControls) mapControls.startPlacingStart();
  };

  const handleEndMarkerSelect = () => {
    if (mapControls) mapControls.startPlacingEnd();
  };

  const handleCalculateRoute = () => {
      if (mapControls) {
          setActiveTab('results');
          setShowSidebar(true);
          mapControls.calculateRoute();
      }
  };

  const handleZoomIn = () => {
    if (mapControls) mapControls.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapControls) mapControls.zoomOut();
  };

  const handleResetView = () => {
    if (mapControls) mapControls.resetView();
  };

  const handleToggleInfo = () => {
    setActiveTab('info');
    setShowSidebar(true);
  };

  const handleToggleLayers = () => {
    setActiveTab('layers');
    setShowSidebar(true);
  };

  const handleLinesChange = (lines: string[]) => {
    setSelectedLines(lines);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex-1 relative overflow-hidden">
        <main className="w-full h-full">
          <Map 
            selectedLines={selectedLines} 
            onRouteCalculated={onRouteCalculated}
            onCalculating={onCalculating}
            route={route}
            isCalculating={isCalculating}
          />
        </main>

        <Sidebar
          onClose={toggleSidebar}
          isOpen={showSidebar}
          defaultTab={activeTab}
          onLinesChange={handleLinesChange}
          selectedLines={selectedLines}
          sidebarContent={sidebarContent}
        />

        <MapDock
          onStartMarkerSelect={handleStartMarkerSelect}
          onEndMarkerSelect={handleEndMarkerSelect}
          onCalculateRoute={handleCalculateRoute}
          onToggleSidebar={toggleSidebar}
          onToggleInfo={handleToggleInfo}
          onToggleLayers={handleToggleLayers}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
        />
      </div>

      <Footer />
    </div>
  );
};

export default Layout;

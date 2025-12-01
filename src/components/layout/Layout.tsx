import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Map from "@/components/map/Map";
import ControlPanel from "@/components/ui/ControlPanel";
import ZoomControls from "@/components/ui/ZoomControls";

// Update the window interface to match window.mapControls
declare global {
  interface Window {
    mapControls?: {
      startPlacingStart: () => void;
      startPlacingEnd: () => void;
      zoomIn: () => void;
      zoomOut: () => void;
      resetView: () => void;
      flyTo: (lat: number, lng: number, zoom?: number) => void;
    };
  }
}

const Layout = ({ children }: { children: React.ReactNode }) => {

  const handleStartMarkerSelect = () => {
    if (window.mapControls) {
      window.mapControls.startPlacingStart();
    }
  };

  const handleEndMarkerSelect = () => {
    if (window.mapControls) {
      window.mapControls.startPlacingEnd();
    }
  };



  const handleLocationSelect = (lat: number, lon: number) => {
    if (window.mapControls) {
      window.mapControls.flyTo(lat, lon, 14);
      // Optionally place a temporary marker or ask user what to do
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-['Josefin_Sans']">
      <Header />

      <div className="flex-1 relative overflow-hidden">
        {/* Main content (map) always takes full width */}
        <main className="w-full h-full">
          <Map />
          {children}
        </main>

        {/* Unified Control Panel */}
        <ControlPanel
          onStartMarkerSelect={handleStartMarkerSelect}
          onEndMarkerSelect={handleEndMarkerSelect}
          onLocationSelect={handleLocationSelect}
        />

        {/* Zoom Controls */}
        <ZoomControls />
      </div>

      <Footer />
    </div>
  );
};

export default Layout;
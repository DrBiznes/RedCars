import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from "@/components/sidebar/Sidebar";
import Map from "@/components/map/Map";
import MapDock from "@/components/map/MapDock";

// Define our own interface for the map controls to avoid global window property
interface MapControls {
    startPlacingStart: () => void;
    startPlacingEnd: () => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
    resetView?: () => void;
}

const Layout = ({ children }: { children: React.ReactNode }) => {
    const [showSidebar, setShowSidebar] = useState(false);
    const [mapControls, setMapControls] = useState<MapControls | null>(null);

    // Use effect to get the map controls once they're registered
    useEffect(() => {
        const checkForMapControls = () => {
            if (window.mapControls) {
                setMapControls({
                    startPlacingStart: window.mapControls.startPlacingStart,
                    startPlacingEnd: window.mapControls.startPlacingEnd,
                    zoomIn: window.mapControls.zoomIn,
                    zoomOut: window.mapControls.zoomOut,
                    resetView: window.mapControls.resetView
                });
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
        if (mapControls) {
            mapControls.startPlacingStart();
        }
    };

    const handleEndMarkerSelect = () => {
        if (mapControls) {
            mapControls.startPlacingEnd();
        }
    };

    const handleZoomIn = () => {
        if (mapControls && mapControls.zoomIn) {
            mapControls.zoomIn();
        }
    };

    const handleZoomOut = () => {
        if (mapControls && mapControls.zoomOut) {
            mapControls.zoomOut();
        }
    };

    const handleResetView = () => {
        if (mapControls && mapControls.resetView) {
            mapControls.resetView();
        }
    };

    const handleToggleInfo = () => {
        // Show sidebar with info tab active
        setShowSidebar(true);
    };

    const handleToggleLayers = () => {
        // Show sidebar with layers tab active
        setShowSidebar(true);
    };

    return (
        <div className="flex flex-col h-screen">
            <Header />

            <div className="flex flex-1 overflow-hidden relative">
                {showSidebar && (
                    <Sidebar onClose={toggleSidebar} />
                )}

                <main className={`flex-1 ${showSidebar ? 'w-[calc(100%-20rem)]' : 'w-full'}`}>
                    <Map />
                    {children}
                </main>

                {/* Position the dock absolutely relative to the main container so it's above the map */}
                <MapDock
                    onStartMarkerSelect={handleStartMarkerSelect}
                    onEndMarkerSelect={handleEndMarkerSelect}
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
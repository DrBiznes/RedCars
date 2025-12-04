import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RouteResult } from '@/lib/graph';
import { motion, PanInfo, useDragControls } from 'motion/react';
import PanelContent from './PanelContent';

interface MobileControlPanelProps {
    onStartMarkerSelect: () => void;
    onEndMarkerSelect: () => void;
    handleStartLocationSelect: (lat: number, lon: number) => void;
    handleEndLocationSelect: (lat: number, lon: number) => void;
    routeResult: RouteResult | null;
    handleGoogleMapsClick: () => void;
    handleTwitterShare: () => void;
}

const MobileControlPanel: React.FC<MobileControlPanelProps> = ({
    onStartMarkerSelect,
    onEndMarkerSelect,
    handleStartLocationSelect,
    handleEndLocationSelect,
    routeResult,
    handleGoogleMapsClick,
    handleTwitterShare
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const dragControls = useDragControls();

    // Auto-expand when route is calculated on mobile
    useEffect(() => {
        if (routeResult) {
            setIsExpanded(true);
        }
    }, [routeResult]);

    const handleSearchFocus = () => {
        setIsExpanded(true);
    };

    return (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col pointer-events-none">
            <motion.div
                className={cn(
                    "bg-background/95 backdrop-blur-md border-t border-border/50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.2)] rounded-t-3xl overflow-hidden flex flex-col pointer-events-auto",
                    "w-full"
                )}
                initial={{ y: "calc(100% - 160px)" }} // Increased visible height
                animate={{ y: isExpanded ? 0 : "calc(100% - 160px)" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragListener={false} // Disable dragging on the content
                dragControls={dragControls} // Enable dragging via controls
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info: PanInfo) => {
                    if (info.offset.y < -50) {
                        setIsExpanded(true);
                    } else if (info.offset.y > 50) {
                        setIsExpanded(false);
                    }
                }}
            >
                {/* Drag Handle */}
                <div
                    className="w-full flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none bg-muted/30 border-b border-border/50"
                    onPointerDown={(e) => dragControls.start(e)}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
                </div>

                <div className="p-4 space-y-6 overflow-y-auto h-[80vh] overscroll-contain pb-safe">
                    <PanelContent
                        onStartMarkerSelect={onStartMarkerSelect}
                        onEndMarkerSelect={onEndMarkerSelect}
                        handleStartLocationSelect={handleStartLocationSelect}
                        handleEndLocationSelect={handleEndLocationSelect}
                        routeResult={routeResult}
                        handleGoogleMapsClick={handleGoogleMapsClick}
                        handleTwitterShare={handleTwitterShare}
                        onSearchFocus={handleSearchFocus}
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default MobileControlPanel;

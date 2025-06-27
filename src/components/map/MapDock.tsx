import React, { useState } from 'react';
import { Dock, DockIcon } from '@/components/magicui/dock';
import { MapPin, Layers, Info, MenuSquare, Plus, Minus, Compass, Route } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface MapDockProps {
    onStartMarkerSelect: () => void;
    onEndMarkerSelect: () => void;
    onToggleSidebar: () => void;
    onToggleInfo: () => void;
    onToggleLayers: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetView?: () => void;
    onFindRoute?: () => void;
}

const MapDock: React.FC<MapDockProps> = ({
                                             onStartMarkerSelect,
                                             onEndMarkerSelect,
                                             onToggleSidebar,
                                             onToggleInfo,
                                             onToggleLayers,
                                             onZoomIn,
                                             onZoomOut,
                                             onResetView,
                                             onFindRoute
                                         }) => {
    const [activeMarker, setActiveMarker] = useState<'start' | 'end' | null>(null);

    const handleStartMarkerClick = () => {
        setActiveMarker('start');
        onStartMarkerSelect();
    };

    const handleEndMarkerClick = () => {
        setActiveMarker('end');
        onEndMarkerSelect();
    };

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <TooltipProvider>
                <Dock className="bg-background/90 border border-border backdrop-blur-md shadow-lg" direction="middle">
                    {/* Main marker controls */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleStartMarkerClick}
                                    className={cn(
                                        buttonVariants({ variant: activeMarker === 'start' ? 'default' : 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <MapPin color="green" className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Place Start Marker</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleEndMarkerClick}
                                    className={cn(
                                        buttonVariants({ variant: activeMarker === 'end' ? 'default' : 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <MapPin color="red" className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Place End Marker</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    {/* Route finding button */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onFindRoute}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                    disabled={!onFindRoute}
                                >
                                    <Route className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Find Red Car Route</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    {/* Separator */}
                    <Separator orientation="vertical" className="h-8 mx-1" />

                    {/* Zoom controls */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onZoomIn}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <Plus className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Zoom In</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onZoomOut}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <Minus className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Zoom Out</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onResetView}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <Compass className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Reset View</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    {/* Separator */}
                    <Separator orientation="vertical" className="h-8 mx-1" />

                    {/* Info and layers controls */}
                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggleLayers}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <Layers className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Toggle Map Layers</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggleInfo}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <Info className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Historical Information</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>

                    <DockIcon>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggleSidebar}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                                        "size-12 rounded-full"
                                    )}
                                >
                                    <MenuSquare className="size-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Toggle Sidebar</p>
                            </TooltipContent>
                        </Tooltip>
                    </DockIcon>
                </Dock>
            </TooltipProvider>
        </div>
    );
};

export default MapDock;
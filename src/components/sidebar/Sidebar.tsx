import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PELineSelector from '@/components/map/PELineSelector';

interface SidebarProps {
    onClose?: () => void;
    defaultTab?: string;
    isOpen: boolean;
    onLinesChange?: (lines: string[]) => void;
    selectedLines?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ 
    onClose, 
    defaultTab = 'results', 
    isOpen,
    onLinesChange = () => {},
    selectedLines = []
}) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const handleLinesChange = (lines: string[]) => {
        onLinesChange(lines);
    };

    return (
        <aside
            className={cn(
                "fixed top-[60px] left-0 bottom-[40px] w-80 bg-background/95 backdrop-blur-sm text-foreground border-r border-border h-[calc(100vh-100px)] flex flex-col z-10 shadow-lg",
                "transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="font-semibold text-lg">Pacific Electric Red Car</h2>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-4 pt-2">
                    <TabsList className="w-full">
                        <TabsTrigger value="results" className="flex-1">Results</TabsTrigger>
                        <TabsTrigger value="info" className="flex-1">History</TabsTrigger>
                        <TabsTrigger value="layers" className="flex-1">Layers</TabsTrigger>
                    </TabsList>
                </div>

                <div className="p-4 flex-1 overflow-auto">
                    <TabsContent value="results" className="h-full mt-0">
                        {/* Results tab content */}
                        <div className="flex flex-col gap-4">
                            <div className="p-4 border border-border rounded-md bg-accent/10">
                                <h3 className="font-medium mb-2">Route Information</h3>
                                <div className="space-y-2 text-sm">
                                    <p>Set your start and end points on the map to see route comparison.</p>
                                </div>
                            </div>

                            <div className="p-4 border border-border rounded-md">
                                <h3 className="font-medium mb-2">Red Car Route</h3>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm">Travel Time:</span>
                                    <span className="text-sm font-medium">--</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">Distance:</span>
                                    <span className="text-sm font-medium">--</span>
                                </div>
                            </div>

                            <div className="p-4 border border-border rounded-md">
                                <h3 className="font-medium mb-2">Modern Transit</h3>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm">Travel Time:</span>
                                    <span className="text-sm font-medium">--</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">Distance:</span>
                                    <span className="text-sm font-medium">--</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="info" className="h-full mt-0">
                        {/* Info tab content */}
                        <div className="space-y-4">
                            <div className="p-4 border border-border rounded-md bg-accent/10">
                                <h3 className="font-medium mb-2">About the Red Car</h3>
                                <p className="text-sm">
                                    The Pacific Electric Railway Company, nicknamed the Red Cars, was a privately owned mass transit system in Southern California consisting of electrically powered streetcars, interurban cars, and buses. It operated from 1901 to 1961.
                                </p>
                            </div>

                            <div className="p-4 border border-border rounded-md">
                                <h3 className="font-medium mb-2">Historical Impact</h3>
                                <p className="text-sm">
                                    At its height, the Red Car system operated over 1,100 miles of track across Los Angeles and surrounding areas, connecting cities from Newport Beach to San Fernando.
                                </p>
                            </div>

                            <div className="p-4 border border-border rounded-md">
                                <h3 className="font-medium mb-2">The Decline</h3>
                                <p className="text-sm">
                                    The system began to decline after World War II as automobiles became more popular and affordable, with the last Red Car line closing in 1961.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="layers" className="h-full mt-0">
                        {/* Layers tab content */}
                        <div className="space-y-4">
                            <div className="p-4 border border-border rounded-md">
                                <h3 className="font-medium mb-2">Red Car Lines</h3>
                                <PELineSelector 
                                    onLinesChange={handleLinesChange}
                                    selectedLines={selectedLines}
                                />
                            </div>

                            <div className="p-4 border border-border rounded-md">
                                <h3 className="font-medium mb-2">Base Map Style</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center">
                                        <input type="radio" name="basemap" id="standard" className="mr-2" defaultChecked />
                                        <label htmlFor="standard" className="text-sm">Standard</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="radio" name="basemap" id="satellite" className="mr-2" />
                                        <label htmlFor="satellite" className="text-sm">Satellite</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="radio" name="basemap" id="historic" className="mr-2" />
                                        <label htmlFor="historic" className="text-sm">Historic Style</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </aside>
    );
};

export default Sidebar;
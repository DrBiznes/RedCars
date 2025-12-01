
import { Button } from '@/components/ui/button';
import { Plus, Minus, RotateCcw } from 'lucide-react';

const ZoomControls = () => {
    const handleZoomIn = () => {
        if (window.mapControls) {
            window.mapControls.zoomIn();
        }
    };

    const handleZoomOut = () => {
        if (window.mapControls) {
            window.mapControls.zoomOut();
        }
    };

    const handleResetView = () => {
        if (window.mapControls) {
            window.mapControls.resetView();
        }
    };

    return (
        <div className="absolute bottom-12 right-6 z-10 flex flex-col gap-2">
            <div className="bg-background/90 backdrop-blur-md border border-border/50 shadow-lg rounded-xl overflow-hidden flex flex-col">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleResetView}
                    className="h-10 w-10 rounded-none hover:bg-muted/50 active:bg-muted transition-colors"
                    aria-label="Reset View"
                >
                    <RotateCcw className="h-5 w-5 text-foreground" />
                </Button>
                <div className="h-[1px] bg-border/50 w-full" />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    className="h-10 w-10 rounded-none hover:bg-muted/50 active:bg-muted transition-colors"
                    aria-label="Zoom In"
                >
                    <Plus className="h-5 w-5 text-foreground" />
                </Button>
                <div className="h-[1px] bg-border/50 w-full" />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    className="h-10 w-10 rounded-none hover:bg-muted/50 active:bg-muted transition-colors"
                    aria-label="Zoom Out"
                >
                    <Minus className="h-5 w-5 text-foreground" />
                </Button>
            </div>
        </div>
    );
};

export default ZoomControls;

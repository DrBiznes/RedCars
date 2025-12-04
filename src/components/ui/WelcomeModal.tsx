import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WelcomeModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasVisited = localStorage.getItem('hasVisited');
        if (!hasVisited) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasVisited', 'true');
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleClose();
        }}>
            <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-md border-red-car-red/20 shadow-2xl rounded-2xl">
                <DialogHeader className="flex flex-col items-center text-center space-y-4">
                    <div className="rounded-full overflow-hidden border-4 border-red-car-red/20 shadow-inner">
                        <img
                            src="/image.png"
                            alt="Pacific Electric Red Car"
                            className="h-24 w-24 object-cover"
                        />
                    </div>
                    <DialogTitle className="font-['Josefin_Sans'] text-3xl font-bold text-foreground">
                        Hello There
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-muted/30 p-6 rounded-lg border border-border/50">
                        <p className="text-base text-foreground/90 leading-relaxed font-medium">
                            I built this project because I wanted to see how my modern-day commute would compare if the Pacific Electric "Red Car" network was still functional today.
                        </p>
                        <p className="text-base text-foreground/90 leading-relaxed mt-4">
                            The Pacific Electric Pathfinder reconstructs the lost system, allowing you to plan routes in a dreamy transit-connected Los Angeles.
                        </p>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center">
                    <Button
                        onClick={handleClose}
                        className="w-full sm:w-auto min-w-[200px] bg-red-car-red hover:bg-red-car-red/90 text-white font-['Josefin_Sans'] text-lg tracking-wide shadow-lg shadow-red-car-red/20"
                    >
                        Take me there!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WelcomeModal;

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeaderProps {
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isCollapsed = false, onToggleCollapse }) => {
    return (
        <header className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="container mx-0 max-w-none p-4 flex justify-between items-start">
                <div className="flex items-start gap-2 pointer-events-auto">
                    <div className="bg-background/90 backdrop-blur-md border border-border/50 shadow-lg rounded-2xl p-3 flex items-center gap-3">
                        <img src="/PELogoBW.svg" alt="Pacific Electric Logo" className="h-10 w-10 opacity-90" />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-foreground leading-none font-['Josefin_Sans'] tracking-tight">Pacific Electric</span>
                            <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase">Time Machine</span>
                        </div>
                    </div>

                    {onToggleCollapse && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-[66px] w-10 rounded-2xl shadow-lg bg-background/90 backdrop-blur-md border border-border/50"
                            onClick={onToggleCollapse}
                        >
                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <Button variant="secondary" size="sm" className="rounded-full shadow-md bg-background/90 backdrop-blur-md border border-border/50 font-['Josefin_Sans']">About</Button>
                </div>
            </div>
        </header>
    );
};

export default Header;
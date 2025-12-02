
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Header = () => {
    return (
        <header className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="container mx-0 max-w-none p-6 flex justify-between items-start">
                <div className="flex items-start gap-2 pointer-events-auto">
                    <div className="bg-background/90 backdrop-blur-md border border-border/50 shadow-lg rounded-2xl p-5 flex items-center gap-4">
                        <img src="/PELogoBW.svg" alt="Pacific Electric Logo" className="h-16 w-16 opacity-90" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-foreground leading-none font-['Josefin_Sans'] tracking-tight">Pacific Electric</span>
                            <span className="text-sm text-muted-foreground font-medium tracking-widest uppercase mt-1">Pathfinder</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <Link to="/about">
                        <Button variant="secondary" size="sm" className="rounded-full shadow-md bg-background/90 backdrop-blur-md border border-border/50 font-['Josefin_Sans']">About</Button>
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
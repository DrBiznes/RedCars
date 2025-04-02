import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const Header = () => {
    return (
        <header className="w-full bg-background text-foreground py-3 px-4 border-b border-border z-20 relative">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-red-car-red">Pacific Electric</span>
                    <span className="text-sm hidden sm:inline">Time Machine</span>
                </div>

                <div className="relative w-full max-w-md mx-4 hidden md:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for a location..."
                        className="bg-background w-full pl-10 pr-4 py-2 border border-border rounded-full text-sm"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-full">About</Button>
                    <Button variant="outline" size="sm" className="rounded-full">Help</Button>
                </div>
            </div>
        </header>
    );
};

export default Header;
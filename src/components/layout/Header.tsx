import { Button } from '@/components/ui/button';

const Header = () => {
    return (
        <header className="w-full bg-primary text-primary-foreground py-4">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">Pacific Electric Red Car</span>
                    <span className="text-sm">Travel Time Comparison Tool</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm">About</Button>
                    <Button variant="secondary" size="sm">Help</Button>
                </div>
            </div>
        </header>
    );
};

export default Header;
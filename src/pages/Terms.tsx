import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
    return (
        <div className="min-h-screen bg-background text-foreground font-['Josefin_Sans'] p-8 pt-24">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link to="/">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-red-car-red group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Map
                    </Button>
                </Link>
                <h1 className="text-4xl font-bold text-red-car-red">Terms of Service</h1>
                <div className="prose dark:prose-invert">
                    <p>
                        Welcome to Pacific Electric Pathfinder. By using this website, you agree to the following terms.
                    </p>
                    <h3>1. Usage</h3>
                    <p>
                        This application is for educational and historical visualization purposes only. The routes and travel times are estimates based on historical data and should not be used for actual navigation (obviously, since the trains are gone).
                    </p>
                    <h3>2. Liability</h3>
                    <p>
                        We are not responsible for any nostalgia-induced sadness regarding the loss of public transit infrastructure.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Terms;

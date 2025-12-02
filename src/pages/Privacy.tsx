import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
    return (
        <div className="min-h-screen bg-background text-foreground font-['Josefin_Sans'] p-8 pt-24">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link to="/">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-red-car-red group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Map
                    </Button>
                </Link>
                <h1 className="text-4xl font-bold text-red-car-red">Privacy Policy</h1>
                <div className="prose dark:prose-invert">
                    <p>
                        Your privacy is important to us.
                    </p>
                    <h3>1. Data Collection</h3>
                    <p>
                        We do not collect any personal data. We use local storage on your device to remember if you have visited the site before (to show the welcome modal).
                    </p>
                    <h3>2. Analytics</h3>
                    <p>
                        We may use anonymous analytics to understand how the site is being used.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Privacy;

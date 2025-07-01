import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { RouteResult } from './routing/types/routing.types';
import RouteResults from './components/routing/RouteResults';

function App() {
    const [route, setRoute] = useState<RouteResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // This function will be passed to the component that triggers the calculation
    const handleRouteCalculated = (calculatedRoute: RouteResult | null) => {
        setRoute(calculatedRoute);
    };

    const handleCalculating = (status: boolean) => {
        setIsCalculating(status);
    };

    return (
        <Layout 
            sidebarContent={
                <RouteResults route={route} loading={isCalculating} />
            }
            onRouteCalculated={handleRouteCalculated}
            onCalculating={handleCalculating}
            route={route}
            isCalculating={isCalculating}
        >
            {/* The Map component is a child of Layout and will be rendered there */}
        </Layout>
    );
}

export default App;

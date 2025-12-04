import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import WelcomeModal from '@/components/ui/WelcomeModal';
import { PacificElectricLoader } from '@/components/ui/PacificElectricLoader';

const About = lazy(() => import('@/pages/About'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function App() {
    return (
        <Router>
            <Suspense fallback={
                <div className="h-screen w-screen flex items-center justify-center bg-background">
                    <PacificElectricLoader className="h-24 w-24 text-red-car-red" />
                </div>
            }>
                <Routes>
                    <Route path="/" element={
                        <Layout>
                            <WelcomeModal />
                            {/* Additional content that might overlay the map can go here */}
                        </Layout>
                    } />
                    <Route path="/about" element={<About />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;
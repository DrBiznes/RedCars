import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import WelcomeModal from '@/components/ui/WelcomeModal';
import About from '@/pages/About';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';

function App() {
    return (
        <Router>
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
            </Routes>
        </Router>
    );
}

export default App;
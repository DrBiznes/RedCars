import Layout from '@/components/layout/Layout';
import WelcomeModal from '@/components/ui/WelcomeModal';

function App() {
    return (
        <Layout>
            <WelcomeModal />
            {/* Additional content that might overlay the map can go here */}
        </Layout>
    );
}

export default App;
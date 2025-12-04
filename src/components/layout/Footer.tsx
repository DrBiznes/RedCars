import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="hidden md:block w-full bg-background text-muted-foreground py-2 text-xs border-t border-border z-20 relative">
            <div className="w-full flex justify-between items-center px-6">
                <div className="flex items-center gap-2">
                    <p>Pacific Electric Pathfinder &copy; {new Date().getFullYear()} Jamino</p>
                    <span>•</span>
                    <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">MIT License</a>
                </div>
                <div className="flex gap-4">
                    <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                    <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                    <a href="mailto:contact@jamino.me" className="hover:text-foreground transition-colors">Feedback</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
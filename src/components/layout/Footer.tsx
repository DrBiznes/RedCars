const Footer = () => {
    return (
        <footer className="w-full bg-background text-muted-foreground py-2 text-xs border-t border-border z-20 relative">
            <div className="w-full flex justify-between items-center px-6">
                <p>Pacific Electric Time Machine &copy; {new Date().getFullYear()}</p>
                <div className="flex gap-4">
                    <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                    <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                    <a href="#" className="hover:text-foreground transition-colors">Feedback</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
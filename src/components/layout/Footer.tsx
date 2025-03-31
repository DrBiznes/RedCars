const Footer = () => {
    return (
        <footer className="w-full bg-primary text-primary-foreground py-3 text-sm">
            <div className="container mx-auto text-center">
                <p>Pacific Electric Red Car Travel Time Comparison Tool &copy; {new Date().getFullYear()}</p>
                <p className="text-xs mt-1 text-primary-foreground/80">A historical transit visualization project</p>
            </div>
        </footer>
    );
};

export default Footer;
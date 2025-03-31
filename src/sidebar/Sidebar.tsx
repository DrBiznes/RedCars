const Sidebar = () => {
    return (
        <aside className="w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full flex flex-col">
            <div className="p-4 border-b border-sidebar-border">
                <h2 className="font-semibold text-lg">Route Planner</h2>
                <p className="text-sm text-sidebar-foreground/80 mt-1">
                    Compare historical Red Car travel times with modern transit options
                </p>
            </div>

            <div className="p-4 flex-1 overflow-auto">
                {/* Search form will go here */}
                <div className="h-24 border border-dashed border-sidebar-border rounded-md flex items-center justify-center text-sidebar-foreground/60">
                    Search form placeholder
                </div>

                {/* Results will go here */}
                <div className="mt-4 h-48 border border-dashed border-sidebar-border rounded-md flex items-center justify-center text-sidebar-foreground/60">
                    Results placeholder
                </div>

                {/* Historical info will go here */}
                <div className="mt-4 h-48 border border-dashed border-sidebar-border rounded-md flex items-center justify-center text-sidebar-foreground/60">
                    Historical info placeholder
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
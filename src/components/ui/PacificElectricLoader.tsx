

export const PacificElectricLoader = ({ className }: { className?: string }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Static Inner Part */}
            <img
                src="/InnerLoading.svg"
                alt="Pacific Electric Logo Inner"
                className="absolute inset-0 w-full h-full object-contain"
            />
            {/* Spinning Outer Part */}
            <img
                src="/OuterLoading.svg"
                alt="Pacific Electric Logo Outer"
                className="absolute inset-0 w-full h-full object-contain animate-spin-slow"
            />
        </div>
    );
};

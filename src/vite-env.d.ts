/// <reference types="vite/client" />

declare global {
    interface Window {
        mapControls?: {
            startPlacingStart: () => void;
            startPlacingEnd: () => void;
        };
    }
}

export {};
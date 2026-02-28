import React, { createContext, useContext, useEffect, useState } from 'react';

interface LayoutContextType {
    isFullWidth: boolean;
    setIsFullWidth: (isFullWidth: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [isFullWidth, setIsFullWidth] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('isFullWidth');
        if (saved !== null) {
            setIsFullWidth(JSON.parse(saved));
        }
    }, []);

    const toggleFullWidth = (value: boolean) => {
        setIsFullWidth(value);
        localStorage.setItem('isFullWidth', JSON.stringify(value));
    };

    return (
        <LayoutContext.Provider value={{ isFullWidth, setIsFullWidth: toggleFullWidth }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}

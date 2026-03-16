import { createContext, useContext, useState, ReactNode } from "react";

interface CurrentProductContextType {
    productCode: string | null;
    setProductCode: (code: string | null) => void;
}

const CurrentProductContext = createContext<CurrentProductContextType | undefined>(undefined);

export function CurrentProductProvider({ children }: { children: ReactNode }) {
    const [productCode, setProductCode] = useState<string | null>(null);

    return (
        <CurrentProductContext.Provider value={{ productCode, setProductCode }}>
            {children}
        </CurrentProductContext.Provider>
    );
}

export function useCurrentProduct() {
    const context = useContext(CurrentProductContext);
    if (context === undefined) {
        throw new Error("useCurrentProduct must be used within a CurrentProductProvider");
    }
    return context;
}

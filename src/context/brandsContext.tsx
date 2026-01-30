import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Marca } from "../types/database";

interface BrandsContextType {
    brands: Marca[];
    activeBrandId: string;
    setBrands: (brands: Marca[]) => void;
    setActiveBrandId: (id: string) => void;
    selectBrand: (brandId: string) => void;
    onBrandSelect: ((brandId: string) => void) | null;
    setOnBrandSelect: (handler: (brandId: string) => void) => void;
}

const BrandsContext = createContext<BrandsContextType | undefined>(undefined);

export function BrandsProvider({ children }: { children: ReactNode }) {
    const [brands, setBrands] = useState<Marca[]>([]);
    const [activeBrandId, setActiveBrandId] = useState<string>("");
    const [onBrandSelect, setOnBrandSelectState] = useState<((brandId: string) => void) | null>(null);

    const setOnBrandSelect = useCallback((handler: (brandId: string) => void) => {
        setOnBrandSelectState(() => handler);
    }, []);

    const selectBrand = useCallback((brandId: string) => {
        if (onBrandSelect) {
            onBrandSelect(brandId);
        }
    }, [onBrandSelect]);

    return (
        <BrandsContext.Provider value={{
            brands,
            activeBrandId,
            setBrands,
            setActiveBrandId,
            selectBrand,
            onBrandSelect,
            setOnBrandSelect,
        }}>
            {children}
        </BrandsContext.Provider>
    );
}

export function useBrands() {
    const context = useContext(BrandsContext);
    if (context === undefined) {
        throw new Error("useBrands must be used within a BrandsProvider");
    }
    return context;
}

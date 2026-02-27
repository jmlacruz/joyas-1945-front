import { useEffect, useState, useCallback } from "react";
import ProductDetails_landsCape from "../productDetails_landsCape/ProductDetails_landsCape";
import ProductDetails_portrait from "../productDetails_portrait/ProductDetails_portrait";
import "./productDetailModal.css";

interface ProductDetailModalProps {
    productID: number | null;
    isOpen: boolean;
    onClose: () => void;
    onProductClick?: (productId: number) => void;
}

const ProductDetailModal = ({ productID, isOpen, onClose, onProductClick }: ProductDetailModalProps) => {
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
    const [key, setKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const checkOrientation = useCallback(() => {
        setIsLandscape(window.innerWidth > window.innerHeight);
    }, []);

    const handleLoaded = useCallback(() => {
        setIsLoading(false);
    }, []);

    // Cuando el modal se abre, resetear loading y actualizar orientación
    useEffect(() => {
        if (isOpen && productID) {
            setIsLoading(true);
            checkOrientation();
            setKey(prev => prev + 1);
        }
    }, [isOpen, productID, checkOrientation]);

    // Manejar cambios de orientación/resize
    useEffect(() => {
        if (!isOpen) return;

        window.addEventListener("resize", checkOrientation);
        window.addEventListener("orientationchange", checkOrientation);
        
        return () => {
            window.removeEventListener("resize", checkOrientation);
            window.removeEventListener("orientationchange", checkOrientation);
        };
    }, [isOpen, checkOrientation]);

    // Manejar scroll del body y clase para ocultar botón flotante WhatsApp en detalle de producto
    useEffect(() => {
        if (isOpen) {
            const scrollWidth = window.innerWidth - document.body.offsetWidth;
            document.body.style.overflow = "hidden";
            document.body.style.marginRight = `${scrollWidth}px`;
            document.body.classList.add("productDetailOpen");
        } else {
            document.body.style.overflow = "";
            document.body.style.marginRight = "";
            document.body.classList.remove("productDetailOpen");
        }

        return () => {
            document.body.style.overflow = "";
            document.body.style.marginRight = "";
            document.body.classList.remove("productDetailOpen");
        };
    }, [isOpen]);

    if (!isOpen || !productID) return null;

    return (
        <div className="productDetailModal_overlay">
            <div className="productDetailModal_content">
                {/* Loader */}
                {isLoading && (
                    <div className="productDetailModal_loader">
                        <div className="productDetailModal_spinner"></div>
                    </div>
                )}
                
                {/* Contenido - oculto mientras carga */}
                <div className={`productDetailModal_inner ${isLoading ? "productDetailModal_hidden" : ""}`}>
                    {isLandscape ? (
                        <ProductDetails_landsCape 
                            key={`landscape-${key}`}
                            productID={productID} 
                            onClose={onClose}
                            onLoaded={handleLoaded}
                            onProductClick={onProductClick}
                        />
                    ) : (
                        <ProductDetails_portrait 
                            key={`portrait-${key}`}
                            productID={productID} 
                            onClose={onClose}
                            onLoaded={handleLoaded}
                            onProductClick={onProductClick}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;

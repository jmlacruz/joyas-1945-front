import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { StreamChatContext } from "../../context/streamChatContext";
import { replaceToCart } from "../../features/cartSlice";
import { getPanoByProductId, getProductByID, getTable } from "../../services/database";
import { sendActivityToChat } from "../../services/streamChat";
import { RootState } from "../../store";
import { Categoria, Marca, Producto } from "../../types/database";
import { formatDecimalPrice } from "../../utils/decimals";
import { swalPopUp } from "../../utils/swal";
import "./productModal.css";

interface ProductModalProps {
    productID: number | null;
    isOpen: boolean;
    onClose: () => void;
}

const ProductModal = ({ productID, isOpen, onClose }: ProductModalProps) => {
    const dispatch = useDispatch();
    const { streamChat } = useContext(StreamChatContext);
    const cart = useSelector((state: RootState) => state.cart.value);
    const { email, city, name, lastName, dolar } = useSelector((state: RootState) => state.user.value);

    const [productData, setProductData] = useState<Producto | null>(null);
    const [pano, setPano] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [brandName, setBrandName] = useState("");
    const [quantity, setQuantity] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const autoSlideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const modalContentRef = useRef<HTMLDivElement | null>(null);

    // Fetch product data when modal opens
    useEffect(() => {
        if (!isOpen || !productID) return;

        setIsLoading(true);
        setCurrentImageIndex(0);

        (async () => {
            try {
                // Fetch product
                const response = await getProductByID(productID);
                if (response.success && response.data && response.data.length) {
                    const product: Producto = response.data[0];
                    setProductData(product);

                    // Fetch pano
                    const panoName = await getPanoByProductId(productID);
                    setPano(panoName);

                    // Fetch category name
                    const categoriesResponse = await getTable({ tableName: "categoria" });
                    if (categoriesResponse.success && categoriesResponse.data) {
                        const category = categoriesResponse.data.find(
                            (cat: Categoria) => cat.id === product.categoria
                        );
                        setCategoryName(category?.nombre || "");
                    }

                    // Fetch brand name
                    const brandsResponse = await getTable({ tableName: "marca" });
                    if (brandsResponse.success && brandsResponse.data) {
                        const brand = brandsResponse.data.find(
                            (b: Marca) => b.id === product.marca
                        );
                        setBrandName(brand?.descripcion || "");
                    }
                }
            } catch (error) {
                console.error("Error fetching product data:", error);
            } finally {
                setIsLoading(false);
            }
        })();

        // Send activity to chat
        if (streamChat.channel && productData) {
            sendActivityToChat({
                userName: name,
                userLastName: lastName,
                userCity: city,
                itemDescription: productData.nombre || "",
                itemImgSrc: productData.thumbnail1 || "",
                userEmail: email,
                productID: productID,
                timestamp: Date.now(),
                streamChatChannel: streamChat.channel,
                activityType: "showProduct",
                total: 0,
            });
        }
    }, [isOpen, productID]);

    // Send activity when product data is loaded
    useEffect(() => {
        if (!productData || !streamChat.channel) return;
        sendActivityToChat({
            userName: name,
            userLastName: lastName,
            userCity: city,
            itemDescription: productData.nombre || "",
            itemImgSrc: productData.thumbnail1 || "",
            userEmail: email,
            productID: productID || 0,
            timestamp: Date.now(),
            streamChatChannel: streamChat.channel,
            activityType: "showProduct",
            total: 0,
        });
    }, [productData]);

    // Sync quantity with cart
    useEffect(() => {
        if (!productID) return;
        const cartItem = cart.cartItems.find((item) => item.itemId === productID);
        setQuantity(cartItem?.quantity || 0);
    }, [cart, productID]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            const scrollWidth = window.innerWidth - document.body.offsetWidth;
            document.body.style.overflow = "hidden";
            document.body.style.marginRight = `${scrollWidth}px`;
        } else {
            document.body.style.overflow = "auto";
            document.body.style.marginRight = "0px";
        }

        return () => {
            document.body.style.overflow = "auto";
            document.body.style.marginRight = "0px";
        };
    }, [isOpen]);

    // Auto-slide images
    useEffect(() => {
        if (!isOpen || !productData?.foto2) return;

        const startAutoSlide = () => {
            autoSlideTimeoutRef.current = setTimeout(() => {
                setCurrentImageIndex((prev) => (prev === 0 ? 1 : 0));
            }, 5000);
        };

        startAutoSlide();

        return () => {
            if (autoSlideTimeoutRef.current) {
                clearTimeout(autoSlideTimeoutRef.current);
            }
        };
    }, [isOpen, productData, currentImageIndex]);

    // Handle keyboard events
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setProductData(null);
            setPano("");
            setCategoryName("");
            setBrandName("");
            setQuantity(0);
            onClose();
        }, 300);
    };

    const handleImageChange = (index: number) => {
        if (autoSlideTimeoutRef.current) {
            clearTimeout(autoSlideTimeoutRef.current);
        }
        setCurrentImageIndex(index);
    };

    const handleQuantityChange = (add: boolean) => {
        if (add) {
            setQuantity((prev) => prev + 1);
        } else {
            setQuantity((prev) => (prev > 0 ? prev - 1 : 0));
        }
    };

    const handleAddToCart = async () => {
        if (quantity === 0 || !productID) return;

        // Send activity to chat
        if (process.env.REACT_APP_SEND_STREAM_CHAT_GLOBAL_NOTIFICATION) {
            const isProductInCart = cart.cartItems.find((item) => item.itemId === productID);
            if (streamChat.channel && !isProductInCart && productData) {
                await sendActivityToChat({
                    userName: name,
                    userLastName: lastName,
                    userCity: city,
                    itemDescription: productData.nombre || "",
                    itemImgSrc: productData.thumbnail1 || "",
                    userEmail: email,
                    productID: productID,
                    timestamp: Date.now(),
                    streamChatChannel: streamChat.channel,
                    activityType: "buy",
                    total: 0,
                });
            }
        }

        dispatch(replaceToCart({ itemId: productID, quantity: quantity }));
        swalPopUp("Acción completada", "Producto agregado al carrito", "success");
    };
    // Price formatting
    const isUsd = dolar ?? true;
    const priceValue = isUsd ? productData?.precioDolar : productData?.precio;
    
    const formattedPrice = useMemo(() => {
        if (!priceValue) return "";
        return isUsd 
            ? `USD ${formatDecimalPrice(priceValue)}`
            : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(priceValue);
    }, [priceValue, isUsd]);

    const formattedFullPrice = useMemo(() => {
        if (!productData?.con_descuento || !productData?.precio_full) return "";
        // Para USD: calcular el precio full usando el porcentaje de descuento aplicado al precio en dólares
        // precio_full_usd = precioDolar / (1 - porcentaje_descuento/100)
        let fullPriceValue: number;
        if (isUsd) {
            if (productData.porcentaje_descuento && productData.porcentaje_descuento > 0) {
                // Calcular precio full USD basado en el porcentaje de descuento
                fullPriceValue = (productData.precioDolar || 0) / (1 - productData.porcentaje_descuento / 100);
            } else {
                // Fallback: usar la tasa de conversión ARS->USD
                fullPriceValue = productData.precio_full * ((productData.precioDolar || 0) / (productData.precio || 1));
            }
        } else {
            fullPriceValue = productData.precio_full;
        }
        return isUsd
            ? `USD ${formatDecimalPrice(fullPriceValue)}`
            : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(fullPriceValue);
    }, [productData, isUsd]);

    const images = useMemo(() => {
        if (!productData) return [];
        const imgs = [productData.foto1];
        if (productData.foto2) imgs.push(productData.foto2);
        return imgs;
    }, [productData]);

    if (!isOpen) return null;

    return (
        <div 
            className={`productModal_overlay ${isClosing ? "productModal_overlay--closing" : ""}`} 
            onClick={handleClose}
        >
            <div 
                className={`productModal_content ${isClosing ? "productModal_content--closing" : ""}`}
                onClick={(e) => e.stopPropagation()}
                ref={modalContentRef}
            >
                {/* Close button */}
                <button className="productModal_closeBtn" onClick={handleClose} aria-label="Cerrar">
                    <img src="/images/icons/close.png" alt="Cerrar" />
                </button>

                {isLoading ? (
                    <div className="productModal_loading">
                        <div className="productModal_spinner"></div>
                        <p>Cargando producto...</p>
                    </div>
                ) : productData ? (
                    <div className="productModal_body">
                        {/* Image gallery */}
                        <div className="productModal_gallery">
                            <div className="productModal_mainImageCont">
                                {images.map((img, index) => (
                                    <img
                                        key={index}
                                        src={img}
                                        alt={`${productData.nombre} - Imagen ${index + 1}`}
                                        className={`productModal_mainImage ${
                                            index === currentImageIndex ? "productModal_mainImage--active" : ""
                                        }`}
                                        onError={(e) => (e.target as HTMLImageElement).src = "/images/logos/logo_black.png"}
                                    />
                                ))}
                            </div>

                            {/* Image indicators */}
                            {images.length > 1 && (
                                <div className="productModal_imageIndicators">
                                    {images.map((_, index) => (
                                        <button
                                            key={index}
                                            className={`productModal_imageIndicator ${
                                                index === currentImageIndex ? "productModal_imageIndicator--active" : ""
                                            }`}
                                            onClick={() => handleImageChange(index)}
                                            aria-label={`Ver imagen ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Thumbnails */}
                            {images.length > 1 && (
                                <div className="productModal_thumbnails">
                                    {productData.thumbnail1 && (
                                        <img
                                            src={productData.thumbnail1}
                                            alt="Miniatura 1"
                                            className={`productModal_thumbnail ${currentImageIndex === 0 ? "productModal_thumbnail--active" : ""}`}
                                            onClick={() => handleImageChange(0)}
                                        />
                                    )}
                                    {productData.thumbnail2 && (
                                        <img
                                            src={productData.thumbnail2}
                                            alt="Miniatura 2"
                                            className={`productModal_thumbnail ${currentImageIndex === 1 ? "productModal_thumbnail--active" : ""}`}
                                            onClick={() => handleImageChange(1)}
                                        />
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Product info */}
                        <div className="productModal_info">
                            {/* Name */}
                            <h2 className="productModal_name">{productData.nombre}</h2>

                            {/* Code */}
                            <p className="productModal_code">
                                <span className="productModal_label">Código:</span> {productData.codigo}
                            </p>

                            {/* Description */}
                            {productData.descripcion && (
                                <div className="productModal_descriptionCont">
                                    <p className="productModal_label">Descripción:</p>
                                    <p className="productModal_description">{productData.descripcion}</p>
                                </div>
                            )}

                            {/* Category & Brand */}
                            <div className="productModal_metaCont">
                                {categoryName && (
                                    <p className="productModal_meta">
                                        <span className="productModal_label">Categoría:</span> {categoryName}
                                    </p>
                                )}
                                {brandName && (
                                    <p className="productModal_meta">
                                        <span className="productModal_label">Marca:</span> {brandName}
                                    </p>
                                )}
                                {pano && (
                                    <p className="productModal_meta">
                                        <span className="productModal_label">Paños:</span> {pano}
                                    </p>
                                )}
                            </div>

                            <div className="productModal_priceCont">
                                {!!productData.con_descuento && (
                                    <div className="productModal_discountInfo">
                                        <span className="productModal_originalPrice">{formattedFullPrice}</span>
                                    </div>
                                )}
                                <p className="productModal_price">{formattedPrice}</p>
                            </div>

                            {/* Quantity selector */}
                            <div className="productModal_quantityCont">
                                <p className="productModal_quantityLabel">Cantidad:</p>
                                <div className="productModal_quantitySelector">
                                    <button 
                                        className="productModal_quantityBtn" 
                                        onClick={() => handleQuantityChange(false)}
                                        aria-label="Reducir cantidad"
                                    >
                                        -
                                    </button>
                                    <span className="productModal_quantityValue">{quantity}</span>
                                    <button 
                                        className="productModal_quantityBtn" 
                                        onClick={() => handleQuantityChange(true)}
                                        aria-label="Aumentar cantidad"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Add to cart button */}
                            <button 
                                className={`productModal_addToCartBtn ${quantity > 0 ? "productModal_addToCartBtn--active" : ""}`}
                                onClick={handleAddToCart}
                                disabled={quantity === 0}
                            >
                                <img src="/images/icons/cart.png" alt="Carrito" />
                                <p>Añadir al carrito</p>
                            </button>

                            {/* Additional info */}
                            <div className="productModal_additionalInfo">
                                {productData.colecciones === "1" && (
                                    <span className="productModal_badge">En colección</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="productModal_error">
                        <p>No se pudo cargar el producto</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductModal;

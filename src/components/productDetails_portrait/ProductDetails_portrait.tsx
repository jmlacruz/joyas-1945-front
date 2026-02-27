import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { SpinnerContext } from "../../context/spinnerContext";
import { StreamChatContext } from "../../context/streamChatContext";
import { addToCart, subtractToCart } from "../../features/cartSlice";
import { getPanoByProductId, getProductByID } from "../../services/database";
import { sendActivityToChat } from "../../services/streamChat";
import { RootState } from "../../store";
import { Producto } from "../../types/database";
import { WHATSAPP_URL } from "../floatingWhatsAppButton/FloatingWhatsAppButton";
import { formatCurrencyPrice } from "../../utils/decimals";
import { showElement } from "../../utils/utils";
import waitAllImagesCharged from "../../utils/waitAllImagesCharged";
import "./productDetails_portrait.css";
 
function ProductDetails_portrait (props: {productID: number, onClose?: () => void, onLoaded?: () => void, onProductClick?: (productId: number) => void}) {

    const cart = useSelector((state: RootState) => state.cart.value);
    const dispatch = useDispatch();
    const {showSpinner} = useContext(SpinnerContext);
    const [productData, setProductData] = useState <Partial<Producto> | null> (null);
    const [imageToDownloadSrc, setImageToDownload] = useState ("");
    const [quantity, setQuantity] = useState (0);
    const navigate = useNavigate();
    const { email, city, name, lastName } = useSelector((state: RootState) => state.user.value);
    const { streamChat } = useContext(StreamChatContext);
    const [pano, setPano] = useState("");
    const timeoutID = useRef <NodeJS.Timeout | null> (null);
    const autoChangeImageDelayInSeg = useRef(5);
  
    useEffect(() => {
        showSpinner(true);  

        if (!props.productID) {
            if (props.onClose) {
                props.onClose();
            } else {
                navigate("/home");
            }
            showSpinner(false);  
            return;
        }

        (async () => {
            const response = await getProductByID(props.productID);
            if (response.success && response.data && response.data.length) {
                const productData: Producto = response.data[0];
                setProductData(productData);
                setImageToDownload(productData.foto1);
                setPano(await getPanoByProductId(props.productID));
                props.onLoaded?.(); // Notificar que los datos están listos
            }
        })();
       
    }, [props.productID]);
    
    useEffect(() => {
        const productData = cart.cartItems.find((product) => product.itemId === props.productID);
        productData ? setQuantity(productData.quantity) : setQuantity(0);
    }, [cart]);
    
    useEffect(() => {                                                                         //Lanzamos el spinner mientras se cargan las imagenes del producto
        if (!productData) return; 
        
        (async() => {
            const productDetailsPortrait_cont = document.querySelector(".productDetailsPortrait_cont") as HTMLDivElement;
            await waitAllImagesCharged();
            showElement(true);
            showSpinner(false);
            productDetailsPortrait_cont.classList.add("opacityOnAnimation");
        })();

        /********************************** Eventos touch en imágenes ******************************************/
        
        const sliderCont: HTMLElement | null = document.querySelector(".productDetailsPortrait_mainImgCont");
        
        let startX: number;
        let startY: number;
        let endX: number;
        let endY: number;
        
        const start = (e: TouchEvent) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        };
        
        const end = (e: TouchEvent) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            const Ax = endX - startX;
            const Ay = Math.abs(endY - startY);
            if (Ax > 50 && Ay < 100) {
                handleChangeImage(false);
            } else if (Ax < -50 && Ay < 100) {
                handleChangeImage(true);
            }
        };
        
        if (productData.foto1 && productData.foto2) {                                                           //Solo activamos los eventos touch de cambio de imagenes y el slider automatico si hay 2 fotos                                                                                              
            timeoutID.current = setTimeout(() => {
                handleChangeImage(true);
            }, autoChangeImageDelayInSeg.current * 1000);
                                                                
            sliderCont?.addEventListener("touchstart", start);
            sliderCont?.addEventListener("touchend", end);
        }

        return () => {
            if (productData.foto1 && productData.foto2) {
                sliderCont?.removeEventListener("touchstart", start);
                sliderCont?.removeEventListener("touchend", end);
            }
        };
    }, [productData]);
       
    const handleItemQuantity = async (add: boolean) => {
        if (add) {
            if (process.env.REACT_APP_SEND_STREAM_CHAT_GLOBAL_NOTIFICATION) {                                                            //Solo generamos notificaciones de compras en produccion
                const isProductInCart = cart.cartItems.find((item) => item.itemId === props.productID);                                 // y si el producto agregado no esta en el carrito
                if (streamChat.channel && !isProductInCart && productData && productData.nombre && productData.thumbnail1) {
                    sendActivityToChat({
                        userName: name, 
                        userLastName: lastName, 
                        userCity: city, 
                        itemDescription: productData.nombre, 
                        itemImgSrc: productData.thumbnail1, 
                        userEmail: email, productID: props.productID, 
                        timestamp: Date.now(),
                        streamChatChannel: streamChat.channel,
                        activityType: "buy",
                        total: 0,
                    });
                }    
            }
            setQuantity((currentQuantity) => currentQuantity + 1);
            dispatch(addToCart(props.productID));
        } else {
            setQuantity((currentQuantity) => currentQuantity > 0 ? currentQuantity - 1 : 0);
            dispatch(subtractToCart(props.productID));
        }  
    };

    const downloadImage = (url: string) => {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    
    const handleChangeImage = (next: boolean) => {
        clearTimeout(timeoutID.current as NodeJS.Timeout);    

        const imagesCont = document.querySelector(".productDetailsPortrait_mainImgSliderCont") as HTMLDivElement;
        if (!imagesCont) return;
        imagesCont.style.animationName = "unset";

        const firstImageID = (imagesCont.firstChild as HTMLImageElement).id;
        changeImageIndex(firstImageID === "1" ? 0 : 1);

        if (next) {
            imagesCont.style.animationName = "productDetailNextImage";
            const animation = imagesCont.getAnimations()[0];
            animation.addEventListener("finish", () => {
                imagesCont.style.animationName = "unset";
                animation.cancel();
                const firstImage = imagesCont.firstElementChild as HTMLImageElement;
                imagesCont.removeChild(firstImage);
                imagesCont.appendChild(firstImage);
                imagesCont.style.justifyContent = "flex-start";
            });                
        
        } else {
            imagesCont.style.justifyContent = "flex-end";                                                                           //Para que no se vea el cambio de imagen
            const firstImage = imagesCont.firstElementChild as HTMLImageElement;
            imagesCont.removeChild(firstImage);
            imagesCont.appendChild(firstImage);
            imagesCont.style.animationName = "productDetailPrevImage";
            const animation = imagesCont.getAnimations()[0];
            animation.addEventListener("finish", () => {
                imagesCont.style.animationName = "unset";
                animation.cancel();
                imagesCont.style.justifyContent = "flex-start";
            });     
        }

        timeoutID.current = setTimeout(() => {
            handleChangeImage(true);
        }, autoChangeImageDelayInSeg.current * 1000);
    };

    const changeImageIndex = (index: number) => {
        const indexsDivs = document.querySelector(".productDetailsPortrait_mainImg_indexsCont")?.childNodes as NodeListOf<HTMLDivElement>;
        if (!indexsDivs) return;
        indexsDivs.forEach((indexDiv) => {
            indexDiv.classList.remove("productDetailsPortrait_mainImg_indexActive");
        });
        indexsDivs[index].classList.add("productDetailsPortrait_mainImg_indexActive");
    };

    const handleSelectImgIndex = (next: boolean, e: React.MouseEvent) => {
        const target = e.target as HTMLDivElement;
        if (target.classList.contains("productDetailsPortrait_mainImg_indexActive")) return;
        handleChangeImage(next);
    };

    useEffect(() => {
        if (!productData || !streamChat.channel) return;
        sendActivityToChat({
            userName: name, 
            userLastName: lastName, 
            userCity: city, 
            itemDescription: productData.nombre || "", 
            itemImgSrc: productData.thumbnail1 || "", 
            userEmail: email, 
            productID: props.productID, 
            timestamp: Date.now(),
            streamChatChannel: streamChat.channel,
            activityType: "showProduct",
            total: 0,    
        });
    }, [productData]);
               
    return (
        <div className="productDetailsPortrait_cont flex column elementToShow">
            <div className="productDetailsPortrait_backCont flex" onClick={() => props.onClose ? props.onClose() : navigate("/home")}>
                <span>‹</span>
                <p>Volver</p>
            </div>
            <div className="productDetailsPortrait_quantityCont flex">
                <div className="productDetailsPortrait_quantityButton flex" onClick={() => handleItemQuantity(false)}>-</div>
                <div className="productDetailsPortrait_quantity flex">{quantity}</div>
                <div className="productDetailsPortrait_quantityButton flex" onClick={() => handleItemQuantity(true)}>+</div>
            </div>
            <div className="productDetailsPortrait_priceCont flex">
                <div className="productDetailsPortrait_download flex" onClick={() => downloadImage(imageToDownloadSrc)}>
                    <img src="/images/icons/downloadImage.png" alt="Descargar Imagen" />
                </div>
                <div className="productDetailsPortrait_price flex column">
                    {productData?.con_descuento && productData.precio_full != null && (
                        <span className="productDetailsPortrait_priceOriginal">{formatCurrencyPrice(productData.precio_full, "USD")}</span>
                    )}
                    <span>{productData && productData.precioDolar ? formatCurrencyPrice(productData.precioDolar, "USD") : ""}</span>
                </div>
                <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="productDetailsPortrait_ws flex"
                    aria-label="Contactar por WhatsApp"
                >
                    <img src="/images/icons/ws.png" alt="WhatsApp" />
                </a>
            </div>
            <div className="productDetailsPortrait_descriptionCont flex column">
                <h2 className="productDetailsPortrait_descriptionText">{productData ? productData.nombre?.toUpperCase() : ""}</h2>
                {
                    pano &&
                    <p className="productDetails_clothText">Paños: <span>{pano}</span></p> 
                }
            </div>
            <div className="productDetailsPortrait_mainImgCont">
                <div className="productDetailsPortrait_mainImgSliderCont flex">
                    {productData && productData.foto1 && <img src={productData ? productData.foto1 : ""} alt="Producto" className="productDetailsPortrait_mainImg" id="0" />}
                    {productData && productData.foto2 && <img src={productData ? productData.foto2 : ""} alt="Producto" className="productDetailsPortrait_mainImg" id="1" />}
                </div>
                {
                    productData && productData.foto1 && productData.foto2 &&
                    <div className="productDetailsPortrait_mainImg_indexsCont flex">
                        <div className="productDetailsPortrait_mainImg_index productDetailsPortrait_mainImg_indexActive" onClick={(e) => handleSelectImgIndex(false, e)}></div>
                        <div className="productDetailsPortrait_mainImg_index" onClick={(e) => handleSelectImgIndex(true, e)}></div>
                    </div>
                }
            </div>
            <div className="productDetailsPortrait_codeCont flex">
                <p className="productDetailsPortrait_code">Código Prod.:</p>
                <p className="productDetailsPortrait_code flex">{productData ? productData.codigo : ""}</p>
            </div>
        </div>
    );
}

export default ProductDetails_portrait;

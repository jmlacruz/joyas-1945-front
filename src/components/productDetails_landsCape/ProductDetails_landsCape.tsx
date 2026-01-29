import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { SpinnerContext } from "../../context/spinnerContext";
import { StreamChatContext } from "../../context/streamChatContext";
import { replaceToCart } from "../../features/cartSlice";
import { getPanoByProductId, getProductByID } from "../../services/database";
import { sendActivityToChat } from "../../services/streamChat";
import { RootState } from "../../store";
import { Producto } from "../../types/database";
import { formatCurrencyPrice } from "../../utils/decimals";
import { swalPopUp } from "../../utils/swal";
import { showElement } from "../../utils/utils";
import waitAllImagesCharged from "../../utils/waitAllImagesCharged";
import AddButton from "../buttons/addButton/AddButton";
import ProductDetailSlider from "../sliders/productDetailSlider/ProductDetailSlider";
import "./productDetails_landsCape.css";
 
function ProductDetails_landsCape (props: {productID: number, onClose?: () => void, onLoaded?: () => void, onProductClick?: (productId: number) => void}) {

    const navigate = useNavigate();
    const cart = useSelector((state: RootState) => state.cart.value);
    const dispatch = useDispatch();
    const {showSpinner} = useContext(SpinnerContext);
    const [productData, setProductData] = useState <Partial<Producto> | null> (null);
    const [imageToDownloadSrc, setImageToDownloadSrc] = useState ("");
    const [productDetailSlider, setProductDetailSlider] = useState (<></>);
    const [quantity, setQuantity] = useState (0);
    const { email, city, name, lastName } = useSelector((state: RootState) => state.user.value);
    const { streamChat } = useContext(StreamChatContext);
    const [pano, setPano] = useState("");
    const timeoutID = useRef <NodeJS.Timeout | null> (null);
    const autoChangeImageDelayInSeg = useRef(5);

    useEffect(() => {

        showSpinner(true);
    
        (async () => {
            const response = await getProductByID(props.productID);
            if (response.success && response.data && response.data.length) {
                const productData: Producto = response.data[0];
                setProductData(productData);
                setImageToDownloadSrc(productData.foto1);
                setProductDetailSlider(<ProductDetailSlider brandId={productData.marca} categoryId={productData.categoria} onProductClick={props.onProductClick}/>);
                setPano(await getPanoByProductId(props.productID));
                props.onLoaded?.(); // Notificar que los datos están listos
            }
        })();
        
    }, [props]);     

    useEffect(() => {
        const productData = cart.cartItems.find((product) => product.itemId === props.productID);
        productData ? setQuantity(productData.quantity) : setQuantity(0);
    }, [cart]);
    
    useEffect(() => {                                                                         //Lanzamos el spinner mientras se cargan las imagenes del producto
        (async() => {
            if (productData) {
                const productDescription_bgCont = document.querySelector(".productDetails_bgCont") as HTMLDivElement;
                await waitAllImagesCharged();
                showElement(true);
                showSpinner(false);
                productDescription_bgCont.classList.add("opacityOnAnimation");
            }
        })();

        handleImage("img1");
    }, [productData]);
    
    const animateAndClose = () => {                                                           //Manejo de animacion al cerrar el modal      
        const productDescription_bgCont = document.querySelector(".productDetails_bgCont") as HTMLDivElement;
        productDescription_bgCont.classList.add("opacityOffAnimation");
        const animation = productDescription_bgCont.getAnimations()[0];
        animation.onfinish = () => {
            if (props.onClose) {
                props.onClose();
            } else {
                navigate("/home");
            }
        };
    };

    const handleImage = (imageId: "img1" | "img2") => {
        clearTimeout(timeoutID.current as NodeJS.Timeout);                                      //Se limpia el timeout anterior
        const image1 = document.querySelector(".productDetails_mainImg#img1") as HTMLImageElement;
        const image2 = document.querySelector(".productDetails_mainImg#img2") as HTMLImageElement;
        if (!image1 || !image2) return;

        image1.classList.remove("opacity1", "opacity0");
        image2.classList.remove("opacity1", "opacity0");

        if (imageId === "img1") {
            setImageToDownloadSrc(image1.src);
            image1.classList.add("opacity1");
            image2.classList.add("opacity0"); 
        } else if (imageId === "img2") {
            setImageToDownloadSrc(image2.src);
            image1.classList.add("opacity0");
            image2.classList.add("opacity1");
        }

        timeoutID.current = setTimeout(() => {
            handleImage(imageId === "img1" ? "img2" : "img1");
        }, autoChangeImageDelayInSeg.current * 1000);
    };

    const handleItemQuantity = (add: boolean) => {
        add ? setQuantity((currentQuantity) => currentQuantity + 1) : setQuantity((currentQuantity) => currentQuantity > 0 ? currentQuantity - 1 : 0);
    };

    const addToCart = async () => {
        if (quantity === 0) return;
        if (process.env.REACT_APP_SEND_STREAM_CHAT_GLOBAL_NOTIFICATION) {                                                            //Solo generamos notificaciones de compras en produccion
            const isProductInCart = cart.cartItems.find((item) => item.itemId === props.productID);                                  // y si el producto agregado no esta en el carrito
            if (streamChat.channel && !isProductInCart && productData && productData.nombre && productData.thumbnail1) {
                await sendActivityToChat({
                    userName: name, 
                    userLastName: lastName, 
                    userCity: city, 
                    itemDescription: productData.nombre, 
                    itemImgSrc: productData.thumbnail1, 
                    userEmail: email, 
                    productID: props.productID, 
                    timestamp: Date.now(),
                    streamChatChannel: streamChat.channel,
                    activityType: "buy",
                    total: 0,    
                });
            }    
        }
        dispatch(replaceToCart({itemId: props.productID, quantity: quantity}));
        swalPopUp("Acción completada", "Producto agregado al carrito", "success");
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
        <div className="productDetails_bgCont flex column elementToShow">
            <div className="productDetails_cont flex column">
                <img src="/images/icons/close.png" alt="Cerrar" className="productDetails_closeIcon iconHoverBlackToPinkTransition" onClick={animateAndClose} />
                <div className="productDetails_mainCont flex">
                    <div className="productDetails_mainImgCont">
                       
                        {productData && productData.foto1 && <img src={productData ? productData.foto1 : ""} alt="Producto" className="productDetails_mainImg" id="img1"/> }
                        {productData && productData.foto2 &&  <img src={productData ? productData.foto2 : ""} alt="Producto" className="productDetails_mainImg" id="img2"/> } 

                        <a className="productDetails_downloadButton flex" href={imageToDownloadSrc} download target="_blank" rel="noreferrer">
                            <img src="/images/icons/download.png" alt="Download" className="productDetails_downloadImageButton_Img"/>
                            <p>DESCARGAR FOTO</p>
                        </a>
                    </div>
                    <div className="productDetails_mainDescriptionCont flex column">
                        <h2 className="productDetails_descriptionText">{productData? productData.nombre : ""}</h2>
                        <p className="productDetails_clothText">Paños: <span>{pano}</span></p>
                        <p className="productDetails_price">{productData && productData.precioDolar ? formatCurrencyPrice(productData.precioDolar, "USD") : ""}</p>
                        <p className="productDetails_article">Artículo: <span>{productData? productData.codigo : ""}</span> </p>
                        <p className="productDetails_quantityText">CANTIDAD</p>
                        <div className="productDetails_buttonsCont flex">
                            <AddButton susFunction={() => handleItemQuantity(false)} addFunction={() => handleItemQuantity(true)} quantity={quantity}/>
                            <div className="productDetails_addToCartButton flex" onClick={addToCart}>
                                <img src="/images/icons/cart.png" alt="Cart" className="productDetails_addToCartButton_Img" />
                                <p className="productDetails_addToCartButton_text">AÑADIR AL CARRITO</p>
                            </div>
                        </div>
                        <div className="productDetails_imagesCont flex">
                            {productData && productData.thumbnail1 && <img src={productData ? productData.thumbnail1 : ""} alt="Product" className="productDetails_imageThumbnail" onClick={() => handleImage("img1")}/>}
                            {productData && productData.thumbnail2 && <img src={productData ? productData.thumbnail2 : ""} alt="Product" className="productDetails_imageThumbnail" onClick={() => handleImage("img2")}/>}
                        </div>
                    </div>
                </div>
                {productDetailSlider}
            </div>
        </div>
    );
}

export default ProductDetails_landsCape;

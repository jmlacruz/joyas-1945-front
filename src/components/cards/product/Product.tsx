import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { StreamChatContext } from "../../../context/streamChatContext";
import { addToCart, subtractToCart } from "../../../features/cartSlice";
import { sendActivityToChat } from "../../../services/streamChat";
import { RootState } from "../../../store";

import "./product.css";

function Product (props: {
    description: string, 
    code: string, 
    priceUSD?: number, 
    priceARS?: number, 
    // stock: number,
    imgSrc1: string, 
    imgSrc2: string, 
    productID: number, 
    onClickFunction: (productID: number) => void, 
    pano: string, 
    dolar: boolean
}) {

    const cart = useSelector((state: RootState) => state.cart.value);
    const [quantityInCart, setQuantityInCart] = useState (0);
    const dispatch = useDispatch();
    const { email, city, name, lastName} = useSelector((state: RootState) => state.user.value);
    const { streamChat } = useContext(StreamChatContext);
    const productCardContRef = useRef <HTMLDivElement | null> (null);

    useEffect(() => {                                                                                                     //Cada vez que cambia el contenido del carrito, se verifica 
        const isProductInCart = cart.cartItems.find((item) => item.itemId === props.productID);                           // si el producto que esta en la card esta también está en el carrito y si está se muestra su cantidad en la card
        isProductInCart ? setQuantityInCart(isProductInCart.quantity) : setQuantityInCart(0);
    }, [cart, props]);    

    const handleAddToCart = async (add: boolean) => {
        if (add) {
            const isProductInCart = cart.cartItems.find((item) => item.itemId === props.productID);
            if (streamChat.channel && !isProductInCart) sendActivityToChat({
                userName: name, 
                userLastName: lastName, 
                userCity: city, 
                itemDescription: props.description, 
                itemImgSrc: props.imgSrc1, 
                userEmail: email, 
                productID: props.productID, 
                timestamp: Date.now(),
                streamChatChannel: streamChat.channel,
                activityType: "buy",
                total: 0,
            });
            dispatch(addToCart(props.productID));
        } else {
            dispatch(subtractToCart(props.productID));
        }
    };

    const runOnclickFunction = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.getAttribute("class")?.includes("cardProductButton")) props.onClickFunction(props.productID);
    };

    const changeImageOnOver = (e: React.MouseEvent) => {
        if (!props.imgSrc2) return;                                                                                 //Si no hay imagen 2 no hacemos nada
        const target = e.target as HTMLImageElement;
        const images = target.childNodes as NodeListOf<HTMLImageElement>;
        images.forEach((image) => image.classList.remove("opacity1", "opacity0"));
        images[0].classList.add("opacity1");
        images[1].classList.add("opacity0");

        const imgsIndexs = (productCardContRef.current?.querySelector(".productCard_imgsIndexsCont") as HTMLDivElement).querySelectorAll(".productCard_imgsIndex") as NodeListOf<HTMLDivElement>;
        imgsIndexs.forEach((imgIndex) => imgIndex.classList.remove("productCard_imgsIndexActive"));
        imgsIndexs[1].classList.add("productCard_imgsIndexActive");
    };

    const restoreImageOnLeave = (e: React.MouseEvent) => {
        if (!props.imgSrc2) return;                                                                                 //Si no hay imagen 2 no hacemos nada
        const target = e.target as HTMLImageElement;
        const images = target.childNodes as NodeListOf<HTMLImageElement>;
        images.forEach((image) => image.classList.remove("opacity1", "opacity0"));
        images[0].classList.add("opacity0");
        images[1].classList.add("opacity1");

        const imgsIndexs = (productCardContRef.current?.querySelector(".productCard_imgsIndexsCont") as HTMLDivElement).querySelectorAll(".productCard_imgsIndex") as NodeListOf<HTMLDivElement>;
        imgsIndexs.forEach((imgIndex) => imgIndex.classList.remove("productCard_imgsIndexActive"));
        imgsIndexs[0].classList.add("productCard_imgsIndexActive");
    };
         
    const isUsd = props.dolar ?? true;
    const priceValue = isUsd ? props.priceUSD : props.priceARS;
    const formattedPrice = useMemo(() => {
        if (priceValue === undefined || priceValue === null) return "";
        const formatter = isUsd
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
            : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
        return formatter.format(priceValue);
    }, [priceValue, isUsd]);

    const currencyLabel = isUsd ? "USD" : "ARS";

    return (
        <div className="productCardCont flex column" title={props.description.toUpperCase()} onClick={runOnclickFunction} ref={productCardContRef}>
            {   
                quantityInCart ?
                    <div className="productCard_quantityInCardCont flex">
                        {quantityInCart}
                    </div>
                    :
                    null
            }   
            <div className="productCardDescriptionCont flex">
                <p className="productCardDescription">{props.description}</p>  
                <p className="productCardDescriptionDots">...</p>    
            </div>
            <p className="productCardCode flex">{props.code}</p>
            <div 
                className="productCardImgsCont"
                onMouseOver={changeImageOnOver}
                onMouseLeave={restoreImageOnLeave}
            >
                {   
                    props.imgSrc2 &&
                    <img
                        src={props.imgSrc2}
                        alt="Jewelry"
                        loading="lazy"
                        decoding="async"
                        className="productCardImg"
                        onError={(e) => (e.target as HTMLImageElement).src = "/images/logos/logo_black.png"}            /*Si no esta la imagen del producto ponemos el logo de la joyeria*/
                    />  
                } 
                <img 
                    src={props.imgSrc1} 
                    alt="Jewelry" 
                    loading="lazy"
                    decoding="async"
                    className="productCardImg" 
                    onError={(e) => (e.target as HTMLImageElement).src = "/images/logos/logo_black.png"}                 /*Si no esta la imagen del producto ponemos el logo de la joyeria*/
                />    
                {  
                    props.imgSrc2 &&
                    <div className="productCard_imgsIndexsCont flex">
                        <div className="productCard_imgsIndex productCard_imgsIndexActive"></div>
                        <div className="productCard_imgsIndex"></div>
                    </div>
                }
            </div>
            <div className="productCard_Price_Cloth_Stock_Container flex column">
                <div>
                    <div className="productCardPriceCont flex">
                        <p className="productCardPriceSign">{currencyLabel}</p>
                        <p className="productCardPrice">{formattedPrice}</p>
                    </div>
                    {
                        props.pano &&
                        <div className="productCardClothCont flex ">
                            <p className="productCardCloth">Paños:</p>
                            <p>{props.pano}</p>
                        </div>
                    }
                    {/* <p className="productCardStock">stock: {props.stock}</p>s */}
                </div>
                <div className="productCard_CardQuantitySelect_Cont flex">
                    <div className="productCard_CardQuantitySelect_div productCard_CardQuantitySelect_divBlack cardProductButton flex" onClick={() => handleAddToCart(false)}>-</div>
                    <div className="productCard_CardQuantitySelect_div productCard_CardQuantitySelect_divCenter cardProductButton flex">{quantityInCart}</div>
                    <div className="productCard_CardQuantitySelect_div productCard_CardQuantitySelect_divBlack cardProductButton flex" onClick={() => handleAddToCart(true)}>+</div>
                </div>
            </div>
        </div>
    );
}

export default Product;
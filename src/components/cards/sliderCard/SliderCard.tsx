import { useDispatch, useSelector } from "react-redux";
import "./sliderCard.css";
import { RootState } from "../../../store";
import { useContext, useEffect, useMemo, useState } from "react";
import { StreamChatContext } from "../../../context/streamChatContext";
import { addToCart, subtractToCart } from "../../../features/cartSlice";
import { sendActivityToChat } from "../../../services/streamChat";

function SliderCard (props: {description: string, priceUSD?: number, priceARS?: number, imgSrc: string, productID: number, onClickFunction: () => void, dolar: boolean}) {
    const cart = useSelector((state: RootState) => state.cart.value);
    const [quantityInCart, setQuantityInCart] = useState (0);
    const dispatch = useDispatch();
    const { email, city, name, lastName } = useSelector((state: RootState) => state.user.value);
    const { streamChat } = useContext(StreamChatContext);
    
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

    const handleAddToCart = async (add: boolean, e: React.MouseEvent) => {
        e.stopPropagation();                                                                                    //Para que no se dispare el evento de onClickFunction
        if (add) {
            const isProductInCart = cart.cartItems.find((item) => item.itemId === props.productID);
            if (streamChat.channel && !isProductInCart) sendActivityToChat({
                userName: name, 
                userLastName: lastName, 
                userCity: city, 
                itemDescription: props.description, 
                itemImgSrc: props.imgSrc, 
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

    useEffect(() => {                                                                                           //Cada vez que cambia el contenido del carrito, se verifica 
        const isProductInCart = cart.cartItems.find((item) => item.itemId === props.productID);                           // si el producto que esta en la card esta también está en el carrito y si está se muestra su cantidad en la card
        isProductInCart ? setQuantityInCart(isProductInCart.quantity) : setQuantityInCart(0);
    }, [cart, props]);
    
    return (
        <div className="productCardCont slider_productCardCont flex column" title={props.description.toUpperCase()} onClick={props.onClickFunction}>
            <img src="/images/icons/cart2.png" alt="Regalo" className="slider_productCard_cartImg"/>
            <div className="productCardDescriptionCont slider_productCardDescriptionCont flex">
                <p className="productCardDescription">{props.description}</p>  
                <p className="productCardDescriptionDots">...</p>    
            </div>
            <div className="productCardImgsCont">
                <img src={props.imgSrc} alt="Jewelry" className="productCardImg slider_productCardImg"/>
            </div>
            <div className="productCard_Price_Cloth_Stock_Container slider_productCard_Price_Cloth_Stock_Container flex column">
                <div className="productCardPriceCont flex">
                    <p className="productCardPriceSign">{currencyLabel}</p>
                    <p className="productCardPrice">{formattedPrice}</p>
                </div>
                <div className="productCard_CardQuantitySelect_Cont slider_productCard_CardQuantitySelect_Cont flex">
                    <div className="productCard_CardQuantitySelect_div productCard_CardQuantitySelect_divBlack flex" onClick={(e) => handleAddToCart(false, e)}>-</div>
                    <div className="productCard_CardQuantitySelect_div productCard_CardQuantitySelect_divCenter flex">{quantityInCart}</div>
                    <div className="productCard_CardQuantitySelect_div productCard_CardQuantitySelect_divBlack flex" onClick={(e) => handleAddToCart(true, e)}>+</div>
                </div>
            </div>
        </div>
    );
}

export default SliderCard;
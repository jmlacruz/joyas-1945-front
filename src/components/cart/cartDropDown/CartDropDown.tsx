import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { clearCart } from "../../../features/cartSlice";
import { getProductsByIDs } from "../../../services/database";
import { RootState } from "../../../store";
import { Producto } from "../../../types/database";
import { formatDecimalPrice } from "../../../utils/decimals";
import { waitAllImagesChargedInElement } from "../../../utils/waitAllImagesCharged";
import { ImageSpinner } from "../../spinner/Spinner";
import "./cartDropDown.css";

function CartDropDown() {

    const dispatch = useDispatch();
    const cart = useSelector((state: RootState) => state.cart.value);
    const [cartProducts, setCartProducts] = useState <JSX.Element[]> ([]);
    const [showSpinner, setShowSpinner] = useState(false);
    const [total, setTotal] = useState("");
    const { dolar } = useSelector((state: RootState) => state.user.value);
       
    useEffect(() => {
        (async() => {
            const productsCont = document.querySelector(".cartDropDrown_productsCont") as HTMLDivElement;
            productsCont.classList.add("displayNone");
            setShowSpinner(true);

            const cartProductsIdsArr = cart.cartItems.map((item) => item.itemId);
            const response = await getProductsByIDs({iDsArr: cartProductsIdsArr, fieldsArr: ["nombre", "precio", "foto1", "id", "precioDolar"]});
            
            if (response.success && response.data && response.data.length) {
                const productsArrFromDB: Producto[] = response.data;
                const productsArrWithQuantity = productsArrFromDB.map((productFromDB: any) => ({...productFromDB, quantity: cart.cartItems.find((itemInCart) => itemInCart.itemId === productFromDB.id)?.quantity}));
                const total = productsArrWithQuantity.reduce((acc: number, item: any) => acc + (item.quantity * (dolar ? item.precioDolar : item.precio)), 0);

                const cartProductsJSX = productsArrWithQuantity.map((product: any, index: number) => 
                    <div className="cartDropDrown_productCont flex" key={index}>
                        <img src={product.thumbnail1} alt={product.nombre} className="cartDropDrown_img" />
                        <div className="cartDropDrown_infoCont flex column">
                            <p className="cartDropDrown_productDescription">{`${product.quantity} x ${product.nombre}`}</p>
                            <p className="cartDropDrown_productPrice">{dolar ? "USD" : "$"} {product.precioDolar && product.precio ? (dolar ? formatDecimalPrice(product.precioDolar): product.precio) : ""}</p>
                        </div>
                    </div>
                );
                setCartProducts(cartProductsJSX);
                setTotal(dolar ? total.toFixed(2) : (Math.ceil(total)).toString());
            }
        })();
    }, [cart]);
    
    useEffect(() => {
        (async() => {
            if (cartProducts && cartProducts.length) {
                const productsCont = document.querySelector(".cartDropDrown_productsCont") as HTMLDivElement;
                await waitAllImagesChargedInElement(productsCont);     
                productsCont.classList.remove("displayNone");
                setShowSpinner(false);
            }
        })();
    }, [cartProducts]);
       
    return (
        <div className="cartDropDrown dropDownAnimation1_in flex column">
            <div className="cartDropDrown_header flex">
                <p>Total:</p>
                <p className="cartDropDrown_resume_total">{dolar ? "USD" : "$"} {total}</p>
            </div>
            <div className="cartDropDrown_productsCont opacityOnAnimation flex column">
                {cartProducts}
            </div>
            <div className="cartDropDrown_footer flex">
                <Link to="/cart">
                    <button className="customButton1 cartDropDrown_footerButton">VER CARRITO</button>
                </Link>
                <button className="customButton1 cartDropDrown_footerButton" onClick={() => dispatch(clearCart())}>VACIAR CARRITO</button>
            </div>
            {
                showSpinner &&
                <div className="cartDropDrown_spinnerCont flex column">
                    <ImageSpinner/>
                </div>
            }
        </div>
    );
}

export default CartDropDown;
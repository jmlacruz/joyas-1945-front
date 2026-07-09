import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Select1 from "../../../components/dropDowns/select1/Select1";
import { SpinnerContext } from "../../../context/spinnerContext";
import { StreamChatContext } from "../../../context/streamChatContext";
import { options2, options3 } from "../../../data/cartPage_selectsOptions";
import { orderCSS } from "../../../data/orderCss";
import { OrderForMailDataInitialsValues } from "../../../data/orders";
import { addOrEditGeneralObservation } from "../../../features/cartSlice";
import { getProductsByIDs, getTable } from "../../../services/database";
import { newOrder } from "../../../services/newOrder";
import { sendActivityToChat } from "../../../services/streamChat";
import { RootState } from "../../../store";
import { BuyerData, BuyerTypeForLocalStorage, BuyerTypeOptions, OrderForMailData, PaymentMethodForLocalStorage, PaymentOptions, ShippingMethodForLocalStorage } from "../../../types";
import { Metodo_envio, Producto } from "../../../types/database";
import { swalPopUp } from "../../../utils/swal";
import { getClientIP, getCurrentDate, reactComponentToHTML } from "../../../utils/utils";
import waitAllImagesCharged from "../../../utils/waitAllImagesCharged";
import OrderForMail from "../../orderForMail/OrderForMail";
import "./cart.css";
import CartProductRow from "./CartProductRow";
import CartProductRow2 from "./CartProductRow2";
import { formatDecimalPrice } from "../../../utils/decimals";

function Cart() {

    const navigate = useNavigate();
    const {cartItems, generalObservation} = useSelector((state: RootState) => state.cart.value);
    const {email, name, lastName, city, dolar} = useSelector((state: RootState) => state.user.value);
    const [total, setTotal] = useState ("");
    const [cartProductsRows, setCartProductsRows] = useState <JSX.Element[]> ([]);
    const [cartProductsRows2, setCartProductsRows2] = useState <JSX.Element[]> ([]);
    const {showSpinner} = useContext(SpinnerContext);
    const [buyerTypePlaceholderText, setBuyerTypePlaceholderText] = useState <{input1: "CUIT" | "DNI" | "", input2: "Razón Social" | "Nombre Completo" | ""}> ({input1: "", input2: ""});
    const [showTransferOrDepositOptions, setShowTransferOrDepositOptions] = useState(false);
    const {streamChat} = useContext(StreamChatContext);
    const buyerDataInitialValues: BuyerData = {
        "": "",
        "CUIT": "",
        "Razón Social": "",
        "DNI": "",
        "Nombre Completo": "",
    };       
    const buyOptionsSelect = useRef <{
        shippingMethod: string,
        paymentMethod: PaymentOptions,
        buyerType: BuyerTypeOptions,
        buyerData: BuyerData,
    }> (
        {
            shippingMethod: "",
            paymentMethod: "",
            buyerType: "",
            buyerData: buyerDataInitialValues, 
        }
    );
    const orderForMailData = useRef <OrderForMailData> (OrderForMailDataInitialsValues);
    const dispatch = useDispatch();
    const observation1ContRef = useRef <HTMLDivElement | null> (null);
    const [observation1Editing, setObservation1Editing] = useState(false);
    const [observation1HasText, setObservation1HasText] = useState(false);
    const [shippingMethodsNames, setShippingMethodsNames] = useState <string[] | null> (null);
    const [selectedShippingMethodName, setSelectedShippingMethodName] = useState ("");
    const [selectedPaymentMethodName, setSelectedPaymentMethodName] = useState ("");
    const [selectedBuyerTypeName, setSelectedBuyerTypeName] = useState ("");
    const [buyerTypeInputs, setBuyerTypeInputs] = useState <BuyerData> (buyerDataInitialValues); 
    const shippingMethodsDataFromDB = useRef <Metodo_envio[]> ([]);
    const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

    useEffect(() => {
        (async() => {
            const response = await getTable({tableName: "metodo_envio"});
            if (response.success && response.data && response.data.length) {
                const shippingMethodsData: Metodo_envio[] = response.data;
                shippingMethodsDataFromDB.current = shippingMethodsData;
                const shippingMethodsNamesArr = shippingMethodsData.map((shippingMethod) => shippingMethod.nombre);
                setShippingMethodsNames(shippingMethodsNamesArr);
            }
        })();

        const paymentMethodSelectedJSON = localStorage.getItem(`paymentMethodSelected-${email}`);
        if (paymentMethodSelectedJSON) {
            const paymentMethodSelectedOBJ: PaymentMethodForLocalStorage = JSON.parse(paymentMethodSelectedJSON);
            setSelectedPaymentMethodName (paymentMethodSelectedOBJ.paymentMethodName);
            paymentMethodSelectFunc(paymentMethodSelectedOBJ.paymentMethodNumber);
        } else {
            setSelectedPaymentMethodName ("Elegir forma de pago");
            buyOptionsSelect.current.paymentMethod = "";
        }

        const buyerTypeSelectedJSON = localStorage.getItem(`buyerTypeSelected-${email}`);
        if (buyerTypeSelectedJSON) {
            const buyerTypeSelectedOBJ: BuyerTypeForLocalStorage = JSON.parse(buyerTypeSelectedJSON);
            setSelectedBuyerTypeName(buyerTypeSelectedOBJ.buyerTypeName);
            buyerTypeSelectFunc(buyerTypeSelectedOBJ.buyerTypeNumber, true);
        } else {
            setSelectedBuyerTypeName(options3[0]);
            buyerTypeSelectFunc(0);
        }

        const buyerTypeInputsDataJSON = localStorage.getItem(`buyerTypeInputsData-${email}`);
        if (buyerTypeInputsDataJSON) {
            const buyerTypeInputsDataOBJ: BuyerData = JSON.parse(buyerTypeInputsDataJSON);
            setBuyerTypeInputs(buyerTypeInputsDataOBJ);
            buyOptionsSelect.current.buyerData = buyerTypeInputsDataOBJ;
        } else {
            setBuyerTypeInputs(buyerDataInitialValues);
            buyOptionsSelect.current.buyerData = buyerDataInitialValues;
        }

    }, []);

    useEffect(() => {
        if (!shippingMethodsNames) return;
        const shippingMethodSelectedJSON = localStorage.getItem(`shippingMethodSelected-${email}`);
        if (shippingMethodSelectedJSON) {
            const shippingMethodSelectedOBJ: ShippingMethodForLocalStorage = JSON.parse(shippingMethodSelectedJSON);
            setSelectedShippingMethodName(shippingMethodSelectedOBJ.shippingMethodName);
            shippingMethodSelectFunc(shippingMethodSelectedOBJ.shippingMethodNumber);
        } else {
            setSelectedShippingMethodName("Elegir método de envío");
            buyOptionsSelect.current.shippingMethod = "";
        }
    }, [shippingMethodsNames]);
            
    useEffect(() => {
        setObservation1HasText(generalObservation ? true : false);
    }, [generalObservation]);    
    
    useEffect(() => {
        (async() => {
            const cartProductsIdsArr = cartItems.map((item) => item.itemId);
            const cartProductsIdsAndObsArr = cartItems.map((item) => ({itemId: item.itemId, observation: item.observation}));
            const fieldsRequiredArr: (keyof Producto)[] = ["nombre", "precio", "foto1", "id", "foto1", "codigo", "precioDolar", "con_descuento", "precio_full"];
            const response = await getProductsByIDs({iDsArr: cartProductsIdsArr, fieldsArr: fieldsRequiredArr});
            
            if (response.success && response.data && Array.isArray(response.data) as boolean) {
                const productsArrFromDB: Producto[] = response.data;
                const productsArrWithQuantity: (Producto & {quantity: number})[] = productsArrFromDB.map((productFromDB: any) => ({...productFromDB, quantity: cartItems.find((itemInCart) => itemInCart.itemId === productFromDB.id)?.quantity}));
                const total = productsArrWithQuantity.reduce((acc: number, item: any) => acc + (item.quantity * (dolar ? (item.precioDolar || 0) : item.precio)), 0);
                const totalParsed = dolar ? total.toFixed(2) : total.toString();

                const landscapeFormatter = new Intl.NumberFormat(dolar ? "en-US" : "es-AR", { style: "currency", currency: dolar ? "USD" : "ARS" });
                const cartProductsJSX = productsArrWithQuantity.map((product, index: number) => {
                    const unitPriceStr = product.precioDolar && product.precio ? (dolar ? formatDecimalPrice(product.precioDolar) : (Math.ceil(product.precio)).toString()) : "";
                    const totalPriceNum = parseFloat(unitPriceStr) * product.quantity;
                    const totalPriceStr = (dolar ? totalPriceNum.toFixed(2) : totalPriceNum).toString();
                    const fullPriceStr = (product as any).con_descuento && (product as any).precio_full != null
                        ? landscapeFormatter.format((product as any).precio_full)
                        : "";

                    return <CartProductRow
                        key={index}
                        unitPrice={unitPriceStr}
                        totalPrice={totalPriceStr}
                        code={product.codigo}
                        description={product.nombre}
                        imgSrc={product.thumbnail1}
                        id={product.id}
                        quantity={product.quantity}
                        observation={cartProductsIdsAndObsArr.find((productData) => productData.itemId === product.id)?.observation || ""}
                        dolar={dolar}
                        conDescuento={(product as any).con_descuento ? 1 : 0}
                        fullPrice={fullPriceStr}
                    />;
                });

                const cartProductsJSX2 = productsArrWithQuantity.map((product: any, index: number) => {                 //Esta lista aparece cuando de selecciona "Transferencia o deposito bancario"
                    const unitPriceStr = product.precioDolar && product.precio ? (dolar ? formatDecimalPrice(product.precioDolar) : (Math.ceil(product.precio)).toString()) : "";
                    const totalPriceNum = parseFloat(unitPriceStr) * product.quantity;
                    const totalPriceStr = (dolar ? totalPriceNum.toFixed(2) : totalPriceNum).toString();

                    return <CartProductRow2
                        key={index}
                        unitPrice={unitPriceStr}
                        totalPrice={totalPriceStr}
                        code={product.codigo}
                        description={product.nombre}
                        quantity={product.quantity}
                    />;
                });

                setCartProductsRows(cartProductsJSX);
                setCartProductsRows2( cartProductsJSX2);
                setTotal(totalParsed);

                orderForMailData.current = {...orderForMailData.current, productsDataArr: productsArrWithQuantity.map((item) => ({total: item.precio * item.quantity, description: item.nombre, imgSrc: item.thumbnail1, itemObservations: "", quantity: item.quantity, unitPrice: item.precio, code: item.codigo}))};
                orderForMailData.current.currentDate = getCurrentDate();
                orderForMailData.current.total = total;
                orderForMailData.current.generalObservations = "";
            }
        })();
    }, [cartItems, dolar]);

    useEffect(() => {                                                                                            //Seteo de spinner al montar el componente o cambiar la lista de productos en carrito
        if (!cartProductsRows.length) return;
        (async () => {
            showSpinner(true);
            await waitAllImagesCharged();
            showSpinner(false);
        })();
    }, [cartProductsRows]);

    const shippingMethodSelectFunc = (opc: number) => {
        const shippingMethodName = shippingMethodsNames && shippingMethodsNames.length ? shippingMethodsNames[opc] : "";
        buyOptionsSelect.current.shippingMethod = shippingMethodName;

        orderForMailData.current = {...orderForMailData.current, shippingMethod: shippingMethodName};

        const shippingMethodForLocalStorage: ShippingMethodForLocalStorage = {shippingMethodNumber: opc, shippingMethodName};
        localStorage.setItem(`shippingMethodSelected-${email}`, JSON.stringify(shippingMethodForLocalStorage));
    };    

    const paymentMethodSelectFunc = (opc: number) => {    
        const paymentMethodName = options2[opc];                           
        buyOptionsSelect.current.paymentMethod = paymentMethodName;                                                                                                          
        opc === 1 ? setShowTransferOrDepositOptions(true) : setShowTransferOrDepositOptions(false);             //La opción 1 corresponde a la opción "Transferencia o deposito bancario". Si la seleccionamos se abre la tabla correspondiente
                                                                                                                 
        orderForMailData.current = {...orderForMailData.current, paymentMethod: options2[opc]};

        const paymentMethodForLocalStorage: PaymentMethodForLocalStorage = {paymentMethodNumber: opc, paymentMethodName};
        localStorage.setItem(`paymentMethodSelected-${email}`, JSON.stringify(paymentMethodForLocalStorage));
    };                                                                                                           

    const handleChangeBuyerDataInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBuyerTypeInputs((current) => ({...current, [name]: value}));
       
        buyOptionsSelect.current = ({...buyOptionsSelect.current, buyerData: {...buyOptionsSelect.current.buyerData, [name]: value}});
    };

    useEffect(() => {
        localStorage.setItem(`buyerTypeInputsData-${email}`, JSON.stringify(buyerTypeInputs));
    }, [buyerTypeInputs]);
            
    const buyerTypeSelectFunc = (opc: number, keepInputs?: boolean) => {                                                //Textos que se setean en los placeholders de los inputs de tipo de comprador
        if (!keepInputs) {
            localStorage.removeItem(`buyerTypeInputsData-${email}`);
            setBuyerTypeInputs(buyerDataInitialValues);
            buyOptionsSelect.current.buyerData = buyerDataInitialValues;
        }

        const buyerTypeName = options3[opc];
        buyOptionsSelect.current.buyerType = buyerTypeName;

        switch (opc) {
        case 0:
            setBuyerTypePlaceholderText({ input1: "CUIT", input2: "Razón Social" });
            break;
        case 1:
            setBuyerTypePlaceholderText({ input1: "CUIT", input2: "Razón Social" });
            break;
        case 2:
            setBuyerTypePlaceholderText({ input1: "DNI", input2: "Nombre Completo" });
            break;
        }

        const buyerTypeForLocalStorage: BuyerTypeForLocalStorage = {buyerTypeNumber: opc, buyerTypeName};
        localStorage.setItem(`buyerTypeSelected-${email}`, JSON.stringify(buyerTypeForLocalStorage));
    };

    const finalizePurchase = async () => {                                                                            //Validación de campos de datos de compra
        if (!buyOptionsSelect.current.shippingMethod) return swalPopUp("Ops!", "Debe elegir un método de envío", "warning");
        if (!buyOptionsSelect.current.paymentMethod) return swalPopUp("Ops!", "Debe elegir un método de pago", "warning");
        if (buyOptionsSelect.current.paymentMethod !== "Lo resuelvo personalmente") {
            if (buyOptionsSelect.current.buyerType === "Monotributista" || buyOptionsSelect.current.buyerType === "Responsable Inscripto") {
                if (buyOptionsSelect.current.buyerData.CUIT.trim() === "") return swalPopUp("Ops!", "Debe ingresar un CUIT", "warning");
                if (buyOptionsSelect.current.buyerData["Razón Social"].trim() === "") return swalPopUp("Ops!", "Debe ingresar una Razón Social", "warning");
            } else if (buyOptionsSelect.current.buyerType === "Consumidor Final") {
                if (buyOptionsSelect.current.buyerData.DNI.trim() === "") return swalPopUp("Ops!", "Debe ingresar un DNI", "warning");
                if (buyOptionsSelect.current.buyerData["Nombre Completo"].trim() === "") return swalPopUp("Ops!", "Debe ingresar su Nombre Completo", "warning");
            }
        }

        setIsProcessingPurchase(true);
        showSpinner(true);
        const shippingMethodID = shippingMethodsDataFromDB.current.find((method) => method.nombre === buyOptionsSelect.current.shippingMethod)?.id;
        const clientIP = await getClientIP();

        const orderForMail = await OrderForMail({ orderDataFromWeb: orderForMailData.current });

        const response = await newOrder(
            {
                orderHTML: reactComponentToHTML(() => orderForMail),
                orderCSS: orderCSS,
                orderData: {
                    shippingMethodID: shippingMethodID || null,
                    paymentMethod: buyOptionsSelect.current.paymentMethod,
                    buyerType: buyOptionsSelect.current.buyerType,
                    buyerData: buyOptionsSelect.current.buyerData,
                    clientIP,
                }
            }
        );
        showSpinner(false);
        setIsProcessingPurchase(false);
        
        if (response.success) {
            localStorage.setItem("order", JSON.stringify(orderForMailData.current));
            localStorage.removeItem(`paymentMethodSelected-${email}`);
            localStorage.removeItem(`shippingMethodSelected-${email}`);
            localStorage.removeItem(`buyerTypeSelected-${email}`);
            localStorage.removeItem(`buyerTypeInputsData-${email}`);

            sendActivityToChat({
                activityType: "purchase",
                itemDescription: "",
                itemImgSrc: "",
                userEmail: email,
                userCity: city,
                productID: 0,
                streamChatChannel: streamChat.channel,
                timestamp: Date.now(),
                userLastName: lastName,
                userName: name,
                total: parseFloat(total),
            });

            navigate("/finalizedPurchase");
        } else {
            swalPopUp("Error", ` No se pudo procesar la orden, Intente nuevamente. (${response.message})`, "error");
        }
    };

    const handleShowTextArea = (show: boolean) => {
        const textArea = observation1ContRef.current?.querySelector("textarea") as HTMLTextAreaElement;
        textArea.style.display = show ? "flex" : "none";
        const cartPage_generalObservation_title = document.querySelector(".cartPage_generalObservation_title") as HTMLParagraphElement;
        cartPage_generalObservation_title.style.display = show ? "flex" : "none";
    };
        
    const handleObservation1AddText = () => {
        handleShowTextArea(true);
        const textArea = observation1ContRef.current?.querySelector("textarea");
        if (textArea) textArea.readOnly = false;
        setObservation1Editing(true);
        setObservation1HasText(false);
    };

    const handleObservation1SaveText = () => {
        setObservation1Editing(false);
        const textArea = observation1ContRef.current?.querySelector("textarea");
        if (textArea) {
            setObservation1HasText(textArea.value ? true : false);
            textArea.value ? textArea.readOnly = true : handleShowTextArea(false);
            dispatch(addOrEditGeneralObservation(textArea.value));
        }
    };
    
    const handleObservation1Cancel = () => {
        setObservation1Editing(false);
        const textArea = observation1ContRef.current?.querySelector("textarea");
        if (textArea) {
            textArea.value = generalObservation || "";
            setObservation1HasText(textArea.value ? true : false);
            textArea.value ? textArea.readOnly = true : handleShowTextArea(false);
        }
    };

    const handleObservation1DeleteText = () => {
        handleShowTextArea(false);
        setObservation1HasText(false);
        setObservation1Editing(false);
        const textArea = observation1ContRef.current?.querySelector("textarea");
        if (textArea) textArea.value = "";  
        dispatch(addOrEditGeneralObservation(""));
    };  
        
    return (                                                                                                 /* Tabla de productos en carrito */
        <div className="pagesContainer cartPageContainer flex column">
            <div className="cartContainer flex column">
                <p className="faqs_index cartPage_index">Inicio / <span>Detalle del pedido</span></p>
                <h1 className="cartPage_title">Listado del pedido</h1>
                <h2 className="cartPage_subTitle">FINALIZA TU PEDIDO EN SOLO 2 PASOS</h2>
                <div className="cart-container">
                    <table className="cart-table">
                        <thead>
                            <tr className="cart-table_headRow">
                                <th>Nombre del Producto</th>
                                <th>Observaciones</th>
                                <th>Precio</th>
                                <th>Cantidad</th>
                                <th>Total</th>
                                <th>Borrar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartProductsRows}
                            <tr className="cart-table_finalRow">
                                <td colSpan={3}>
                                    <div className="cartTable_flexDivCell flex column" ref={observation1ContRef}>
                                        <p className="cartPage_generalObservation_title" style={{display: generalObservation ? "flex" : "none"}}>
                                            Observación general del pedido
                                        </p>
                                        <textarea 
                                            name="observation" 
                                            id="observation" 
                                            className="cartTable_observation1_textarea cartTable_generalObservation_textArea" 
                                            defaultValue={generalObservation} 
                                            style={{ display: generalObservation ? "flex" : "none" }} 
                                            readOnly 
                                        />
                                        <div className="cartTableLandsCapeGeneralObservation_buttons_cont flex column">
                                            {
                                                !observation1Editing && !observation1HasText &&
                                                <button className="customButton1 cartTable_button mb050" onClick={handleObservation1AddText}>AGREGAR OBSERVACIÓN GENERAL DEL PEDIDO
                                                </button>
                                            }
                                            {
                                                observation1Editing &&
                                                <>
                                                    <button className="customButton1 cartTable_button mb050" onClick={handleObservation1SaveText}>GUARDAR</button>
                                                    <button className="customButton1 cartTable_button mb050" onClick={handleObservation1Cancel}>CANCELAR</button>
                                                </>
                                            }
                                            {
                                                observation1HasText && !observation1Editing &&
                                                <>
                                                    <button className="customButton1 cartTable_button mb050" onClick={handleObservation1AddText}>EDITAR</button>
                                                    <button className="customButton1 cartTable_button mb050" onClick={handleObservation1DeleteText}>BORRAR</button>
                                                </>
                                            }
                                        </div>
                                    </div>
                                </td>
                                <td colSpan={3}>
                                    <div className="cartTable_flexDivCell cartTable_total flex column">
                                        <p className="cartTable_total_text1">Total del Pedido</p>
                                        <p className="cartTable_total_price">{dolar ? "USD" : "$"}{total}</p>
                                        <p className="cartTable_total_text2">* Sin Impuestos</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="cartPage_firstLineButtons flex">                                                         {/* Opciones de método de envío y forma de pago */}
                    <Link to="/home">
                        <button className="customButton1 cartTable_button flex">SEGUIR COMPRANDO</button>
                    </Link>
                    <Select1 options={shippingMethodsNames || []} defaulOption={selectedShippingMethodName} selectResultFunc={shippingMethodSelectFunc}/>
                </div>
                <Select1 options={options2} defaulOption={selectedPaymentMethodName} class="selectStyle" selectResultFunc={paymentMethodSelectFunc}/>

                {   showTransferOrDepositOptions &&                                                                      /* Tabla que aparece cuando se selecciona "Transferencia o deposito bancario" */       
                    <>
                        <div className="cart-container cartTable2_container">
                            <table className="cart-table">
                                <thead>
                                    <tr className="cart-table_headRow">
                                        <th>Nombre del Producto</th>
                                        <th>Precio</th>
                                        <th>Cantidad</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartProductsRows2}
                                    <tr className="cart-table_finalRow">
                                        <td colSpan={4}>
                                            <div className="cartTable_flexDivCell cartTable_total cartTable2_total flex column">
                                                <p className="cartTable_total_text1">Total Neto</p>
                                                <p className="cartTable2_prices_texts">${total}</p>
                                                <div className="flex">
                                                    <p className="cartTable2_finalTexts">21% por IVA</p>
                                                    <p className="cartTable2_prices_texts">${(parseFloat(total) * 0.21).toFixed(2)}</p>
                                                </div>
                                                <p className="cartTable2_prices_texts cartTable2_discount">${dolar ? (parseFloat(total) * 1.21).toFixed(2) : Math.ceil((parseFloat(total) * 1.21))}</p>
                                                <div className="flex">
                                                    <p className="cartTable2_finalTexts">Si abonas ahora, obtenés un 10% de descuento</p>
                                                    <p className="cartTable2_prices_texts">{dolar ? ((parseFloat(total) * 1.21) - (parseFloat(total) * 1.21 * 0.1)).toFixed(2) : Math.ceil((parseFloat(total) * 1.21) - (parseFloat(total) * 1.21 * 0.1))}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>    

                        <div className="cartTable_buyerTypeCont flex">
                            <Select1 options={options3} defaulOption={selectedBuyerTypeName} selectResultFunc={buyerTypeSelectFunc}/>
                            <div className="cartTable_fiscalDataInputCont flex column">
                                {buyerTypeInputs[buyerTypePlaceholderText.input1] && <label className="cartTable_buyerTypeCont_label">{buyerTypePlaceholderText.input1}</label>}
                                <input
                                    type="number"
                                    placeholder={buyerTypePlaceholderText.input1}
                                    className="cartTable_buyerTypeCont_inputs"
                                    name={buyerTypePlaceholderText.input1}
                                    value={buyerTypeInputs[buyerTypePlaceholderText.input1]}
                                    onChange={handleChangeBuyerDataInput}
                                />
                            </div>
                            <div className="cartTable_fiscalDataInputCont flex column">
                                {buyerTypeInputs[buyerTypePlaceholderText.input2] && <label className="cartTable_buyerTypeCont_label">{buyerTypePlaceholderText.input2}</label>}
                                <input
                                    type="text"
                                    placeholder={buyerTypePlaceholderText.input2}
                                    className="cartTable_buyerTypeCont_inputs"
                                    name={buyerTypePlaceholderText.input2}
                                    value={buyerTypeInputs[buyerTypePlaceholderText.input2]}
                                    onChange={handleChangeBuyerDataInput}
                                />
                            </div>
                        </div>

                        <p className="cartTable_bankDataText flex">CUANDO FINALICE LA COMPRA PODRÁ VISUALIZAR LOS DATOS BANCARIOS PARA REALIZAR LA OPERACIÓN CORRESPONDIENTE.</p>
                    </>
                }

                <div className={`cartPage_finalizePurchaseButton flex ${isProcessingPurchase ? "disabled" : ""}`} onClick={isProcessingPurchase ? undefined : finalizePurchase}>
                    {isProcessingPurchase ? "PROCESANDO..." : "FINALIZAR COMPRA"}
                </div>
            </div>
        </div>
    );
}

export default Cart;
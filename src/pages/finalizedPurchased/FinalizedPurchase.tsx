import { useEffect, useState } from "react";
import { RootState } from "../../store";
import "./finalizedPurchase.css";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { OrderForMailData } from "../../types";
import { insertDotsInPrice } from "../../utils/utils";
import CustomButton2 from "../../components/buttons/customButton2/CustomButton2";
import { clearCart } from "../../features/cartSlice";
import { getTable } from "../../services/database";
import { swalPopUp } from "../../utils/swal";
import { System_config } from "../../types/database";

const FinalizedPurchase = () => {
    const user = useSelector((state: RootState) => state.user.value);
    const [bankDataJSX, setBankDataJSX] = useState (<></>);
    const dispatch = useDispatch();
    
    useEffect(() => {
        (async() => {

            dispatch(clearCart());
    
            const response = await getTable({tableName: "system_config", conditions: [{field: "config", value: "banco_datos"}]});
            if (!response.success || !response.data || !response.data.length) {
                swalPopUp("Error", "No se pudieron cargar los datos para la transferencia. Por favor comuniquesé al WhatsApp: 11-6301-3011. Disculpe las molestias ocasionadas", "error");
                return;
            }

            const transferData: System_config = response.data[0];
    
            const orderDataJSON = localStorage.getItem("order");
            if (orderDataJSON) {
                const orderDataOBJ: OrderForMailData = JSON.parse(orderDataJSON);
                if (orderDataOBJ.paymentMethod === "Transferencia o depósito bancario") {
                    setBankDataJSX(
                        <>
                            <div className="finalizedPurchase_line"></div>
                            <div className="finalizedPurchase_bankData flex column">
                                <p className="finalizedPurchase_total">Total a transferir: <span>${insertDotsInPrice(orderDataOBJ.total * 1.21 * 0.9)}</span></p>
                                <br />
                                <p className="finalizedPurchase_transferDataFromDB">{transferData.value}</p>
                            </div>
                        </>
                    );
                } 
            }
        })();
    }, []);
  
    return (
        <div className="pagesContainer finalizedPurchase_pageCont flex column">
            <div className="cartContainer flex column">
                <p className="faqs_index cartPage_index">Inicio / <span>Compra finalizada</span></p>
                <h1 className="finalizedPurchase_title">{`¡Muchas Gracias ${user.name}!`}</h1>
                <p className="finalizedPurchase_subTitle">HAS FINALIZADO TU COMPRA</p>
                {bankDataJSX}
                <div className="finalizedPurchase_line"></div>
                <p className="finalizedPurchase_text">En menos de 24hs se va a estar contactando nuestro staff para afinar los detalles de la solicitud.</p>
                <Link to="/home" className="finalizedPurchase_seguirComprandoLink">
                    <CustomButton2 text="PUEDES SEGUIR COMPRANDO" styles={{marginTop: "2rem"}}/>
                </Link>
            </div>
        </div>
    );
};

export default FinalizedPurchase;

import "./cart.css";
import AddButton from "../../buttons/addButton/AddButton";
import { useDispatch } from "react-redux";
import { addToCart, subtractToCart, deleteItem, addOrEditObservation } from "../../../features/cartSlice";
import { useRef, useState } from "react";

function CartProductRow (props: {description: string, unitPrice: string, totalPrice: string, code: string, imgSrc: string, id: number, quantity: number, observation: string, dolar?: boolean}) {

    const dispatch = useDispatch();
    const observation1ContRef = useRef <HTMLDivElement | null> (null);
    const [observation1Editing, setObservation1Editing] = useState(false);
    const [observation1HasText, setObservation1HasText] = useState(props.observation ? true : false);

    const handleShowTextArea = (show: boolean) => {
        const textArea = observation1ContRef.current?.querySelector("textarea") as HTMLTextAreaElement;
        textArea.style.display = show ? "flex" : "none";
        const cartPage_generalObservation_title = document.querySelector(".cartPage_observation_title") as HTMLParagraphElement;
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
            dispatch(addOrEditObservation({itemId: props.id, observation: textArea.value}));
        }
    };
    
    const handleObservation1Cancel = () => {
        setObservation1Editing(false);
        const textArea = observation1ContRef.current?.querySelector("textarea");
        if (textArea) {
            textArea.value = props.observation;
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
        dispatch(addOrEditObservation({itemId: props.id, observation: ""}));
    };  
    
    return (
        <tr className="cartTable_productRow">
            <td className="product-info">
                <div className="cartTable_flexDivCell flex">
                    <img src={props.imgSrc} alt={props.description} className="cart-table_productImg" />
                    <div className="cart-table_productDescriptionCont flex column">
                        <p className="cartTable_descriptionText">{props.description}</p>
                        <p className="cartTable_article"> <span className="cartTable_articleText">Artículo: </span>{props.code}</p>
                    </div>
                </div>
            </td>
            <td className="cartTable_observation_cell">
                <div className="cartTable_flexDivCell flex column" ref={observation1ContRef}>
                    <p className="cartPage_observation_title" style={{display: props.observation ? "flex" : "none"}}>
                        Observación
                    </p>
                    <textarea 
                        name="observation" 
                        id="observation" 
                        className="cartTable_observation1_textarea" 
                        defaultValue={props.observation} 
                        style={{display: props.observation ? "flex" : "none"}} 
                        readOnly
                    />
                    <div className="flex column">
                        {   
                            !observation1Editing && !observation1HasText && 
                            <button className="customButton1 cartTable_button mb050" onClick={handleObservation1AddText}>AGREGAR OBSERVACIÓN</button>
                        }
                        {  
                            observation1Editing  &&
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
            <td className="cartTable_prices_texts">{props.dolar ? "USD" : "$"}{props.unitPrice}</td>
            <td>
                <div className="cartTable_flexDivCell flex">
                    <AddButton width={5} bgColor="transparent" quantity={props.quantity} addFunction={() => dispatch(addToCart(props.id))} susFunction={() => dispatch(subtractToCart(props.id))}/>
                </div>
            </td>
            <td className="cartTable_prices_texts">{props.dolar ? "USD" : "$"}{props.totalPrice}</td>
            <td>
                <div className="cartTable_flexDivCell flex">
                    <button className="cartTable_deleteButton flex" title="Eliminar producto" onClick={() => dispatch(deleteItem(props.id))}>✖</button>
                </div>
            </td>
        </tr>
    );
}

export default CartProductRow;
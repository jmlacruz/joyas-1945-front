import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getProductsFiltered } from "../../../services/database";
import { RootState } from "../../../store";
import SliderCard from "../../cards/sliderCard/SliderCard";
import "./productDetailSlider.css";

function ProductDetailSlider (props: {categoryId: number, brandId: number, onProductClick?: (productId: number) => void}) {

    const [sliderCards, setSliderCards] = useState <JSX.Element[]> ([]);
    const allowSliderMove = useRef(true);
    const navigate = useNavigate();
    const { dolar } = useSelector((state: RootState) => state.user.value);

    useEffect(() => {

        (async() => {
            const response = await getProductsFiltered({                                     //Obtenemos 8 productos random de la misma categoria y marca que el producto principal
                limit: 8,
                offset: 0,
                fields: ["nombre", "precio", "foto1", "id"],                                //Si requerimos el campo "foto1" (ruta de imagen) el backend agrega el campo "thumbnail" (ruta de thumbnail) automaticamente
                condition: {
                    field: "estado", 
                    operator: "=", 
                    value: "1"
                },
                searchWordsArr: [],
                categoriesIdsArr: [props.categoryId],
                priceRangeArr: [],
                orderBy: "random",
                brand: props.brandId,
            });          
            if (response.success && response.data && response.data.length) {                         
                const productsDataArr = response.data;
                const sliderCardsJSX = productsDataArr.map((productData: any) => 
                    <SliderCard 
                        description={productData.nombre} 
                        imgSrc={productData.thumbnail1} 
                        priceUSD={productData?.precioDolar}
                        priceARS={productData?.precio}
                        onClickFunction={() => {
                            if (props.onProductClick) {
                                props.onProductClick(productData.id);
                            } else {
                                navigate(`/productDetail/${productData.id}`);
                            }
                        }}             
                        productID={productData.id}
                        key={productData.id}
                        dolar={dolar}
                    />
                );
                setSliderCards(sliderCardsJSX);
            }
        })();
    }, []);
 
    const handleMoveSlider = (toRight: boolean) => {
        const slidersCont = document.querySelector(".productDetails_slidersCont") as HTMLDivElement;    
        const distanceToMove = slidersCont.offsetWidth;
        const sliderCont = document.querySelector(".productDetails_sliderCont") as HTMLDivElement;
        const sliderCards = sliderCont.childNodes as NodeListOf <HTMLDivElement>;
        const sliderCardsArr = Array.from(sliderCards);
        const sliderCardsMarginRightStr = getComputedStyle(sliderCardsArr[0]).marginRight;                                  //Nos da el margen derecho de la forma "25.3px" (esta seteado en el css en la clase ".slider_productCardCont" -> margin-right)
        const sliderCardsMarginRightFloat = parseFloat(sliderCardsMarginRightStr.replace("px", ""));                        //Sacamos el "px" y pasamos a float
        const sliderContTransitionDurationStr = getComputedStyle(sliderCont).transitionDuration;                            //Obtenemos el tiempo de transision en forma "0.5s" (el valor esta en la clase "".productDetails_sliderCont")
        const sliderContTransitionDurationFloat_ms = parseFloat(sliderContTransitionDurationStr.replace("s", "")) * 1000;   //Pasamos a milisegundos en float
                                   
        if (toRight) {
            if (!allowSliderMove.current) return;   
            allowSliderMove.current = false;
            sliderCont.style.justifyContent = "flex-end";
            sliderCardsArr.forEach((card) => {
                const marginRightStr = sliderCardsMarginRightStr;
                card.style.marginRight = "0px";
                card.style.marginLeft = marginRightStr;
            });
            for (let i = 7; i > 3; i--) {
                const firstChild = sliderCont.firstChild as HTMLDivElement;
                sliderCont.insertBefore(sliderCardsArr[i], firstChild);
            }
            sliderCont.style.transform = `translateX(${distanceToMove + sliderCardsMarginRightFloat}px)`;
            setTimeout(() => {
                sliderCont.style.transitionDuration = "0s";
                requestAnimationFrame(() => {
                    sliderCont.style.transform = "translateX(0px)";
                    sliderCont.style.justifyContent = "flex-start";
                    sliderCardsArr.forEach((card) => {
                        const marginLeftStr = card.style.marginLeft;
                        card.style.marginLeft = "0px";
                        card.style.marginRight = marginLeftStr;
                    });
                    requestAnimationFrame(() => {
                        sliderCont.style.transitionDuration = sliderContTransitionDurationStr;
                        allowSliderMove.current = true;
                    });
                });
            }, sliderContTransitionDurationFloat_ms);
            
            
        } else {
            if (!allowSliderMove.current) return;   
            allowSliderMove.current = false;
            sliderCont.style.justifyContent = "flex-start";
            sliderCont.style.transform = `translateX(${- (distanceToMove + sliderCardsMarginRightFloat)}px)`; 
            setTimeout(() => {
                for (let i = 0; i < 4; i++) {
                    sliderCont.appendChild(sliderCardsArr[i]);
                }
                sliderCont.style.transitionDuration = "0s";
                requestAnimationFrame(() => {
                    sliderCont.style.transform = "translateX(0px)";
                    requestAnimationFrame(() => {
                        sliderCont.style.transitionDuration = sliderContTransitionDurationStr;
                        allowSliderMove.current = true;
                    });
                });
            }, sliderContTransitionDurationFloat_ms);
        }
    };
        
    return (
        <div className="productDetails_sliderMainCont flex column">
            <div className="productDetails_sliderTitleCont flex">
                <p className="productDetails_sliderTitle">OTROS PRODUCTOS QUE TE PODRIAN INTERESAR</p>
                <div className="productDetails_sliderControlsCont flex">
                    <img src="/images/icons/toLeft.png" alt="Control Izquierda" className="productDetails_sliderControlImg" onClick={() => handleMoveSlider(true)}/>
                    <img src="/images/icons/toLeft.png" alt="Control Izquierda" className="productDetails_sliderControlImg productDetails_sliderControlImg_right" onClick={() => handleMoveSlider(false)}/>
                </div>
            </div>
            <div className="productDetails_slidersCont flex">
                <div className="productDetails_sliderCont flex">
                    {sliderCards}
                </div>
            </div>
        </div>
    );
}

export default ProductDetailSlider;
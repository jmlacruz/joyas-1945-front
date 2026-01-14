import { useContext, useEffect, useState } from "react";
import { SpinnerContext } from "../../context/spinnerContext";
import { getTable } from "../../services/database";
import "./howWorking.css";

function HowWorking () {

    const [faqs, setFaqs] = useState (<></>);
    const { showSpinner} = useContext(SpinnerContext);

    const handleAnswer = (e: React.MouseEvent) => {
        e.stopPropagation();
        const questionCont = e.target as HTMLDivElement;
        const answerCont = questionCont.nextSibling as HTMLDivElement;
        answerCont.classList.toggle("faqs_answerActive");
        !answerCont.style.maxHeight || answerCont.style.maxHeight === "0px" ? answerCont.style.maxHeight = answerCont.scrollHeight + "px" : answerCont.style.maxHeight = "0px";
    };

    const closeSpinner = () => {
        showSpinner(false);
    };

    useEffect(() => {

        showSpinner(true);

        (async () => {
            const response1 = await getTable({tableName: "faqs"});
            const response2 = await getTable({tableName: "faqs_answer"});
            if (response1.success && response1.data.length && response2.success && response2.data.length) {
                const dataQuestions = response1.data;
                const dataAnswers = response2.data;
                dataQuestions.sort((a: any, b: any) => a.order - b.order);

                const faqsJSX = dataQuestions.map((faqQuestion: any, index: number) => 
                    <div className="faqs_seccion flex column" key={index}>
                        <div className="faqs_seccion_question flex" onClick={handleAnswer}>                         {/* Pregunta */}
                            <p className="opcionHoverPinkTransition">{faqQuestion.question}</p>
                            <img src="/images/icons/question.png" alt="Pregunta" className="faqs_questionIcon iconHoverBlackToPinkTransition" />
                        </div>
                        <div className="faqs_seccion_answer flex">                                                  {/* Respuesta */}
                            { 
                                (() => {                                                                            {/* Cada respuesta puede tener mas de 1 texto con su imagen*/}
                                    const dataAnswersArr = dataAnswers.filter((answer: any) => answer.id_faqs === faqQuestion.id);
                                    return (
                                        dataAnswersArr.map((data: any, index: number) => {
                                            return data.value.includes("https://") ?                                /* Si el dato empieza con https es una ruta de iamgen */
                                                <img src={data.value} alt="Respuesta" className="howWorking_answerImg" key={index}/> :  
                                                <p key={index}>{data.value}</p>;                                    /* Si no es un texto */
                                        })                     
                                    );
                                })()
                            }
                        </div>
                    </div>
                );
                setFaqs(faqsJSX);
            }
        })();
      
    }, []);
             
    return (
        <div className="pagesContainer faqs_pageContainer paddingHorizontalPages flex">
            <div className="faqs_container flex column">
                <p className="faqs_index">Inicio / <span>Cómo funciona</span></p>
                <p className="faqs_secondaryTitle">CÓMO FUNCIONA JOYAS 1945</p>
                <h1 className="faqs_mainTitle">Cómo funciona</h1>
            
                <div className="faqs_seccions flex column">
                    {faqs}
                </div>
                <p className="faqs_InfoText">Si no ha encontrado su pregunta en esta guía por favor contactese a través de nuestro formulario o por telefono al: +5411 4382 3361 / whatsapp +54911 6159 1361 </p>
            </div>
        </div>
    );
}

export default HowWorking;
import { useLocation } from "react-router-dom";
import "./footer.css";

function Footer() {

    const location = useLocation();
    const getColorTransitionClass = () => location.pathname.includes("landing") ? "opcionHoverBlueTransition" : "opcionHoverPinkTransition";
    
    return (
        <div className="footerCont flex column">
            <div className="footerTopSection flex">
                <div className="footerTopSectionLogoCont flex">
                    <img width={200} src="/images/logos/logo_black.png" alt="Logo" />
                </div>
                <div className="footerTopSectionJewelryCont flex column">
                    <p className="footerTopSectionJewelryCont_Title">Joyería</p>
                    <div className="footerTopSectionJewelryCont_sections flex">
                        <p className={getColorTransitionClass()}>Anillos</p>
                        <p className={getColorTransitionClass()}>Aros</p>
                        <p className={getColorTransitionClass()}>Colgantes</p>
                        <p className={getColorTransitionClass()}>Conjunto</p>
                        <p className={getColorTransitionClass()}>Gargantillas</p>
                    </div>
                </div>
                <div className="footerTopSectionJewelryCont flex column">
                    <p className="footerTopSectionJewelryCont_Title">Sitemap</p>
                    <div className="footerTopSectionJewelryCont_sections flex">
                        <p className={getColorTransitionClass()}>Faqs</p>
                        <p className={getColorTransitionClass()}>Contacto</p>
                        <p className={getColorTransitionClass()}>Mi Cuenta</p>
                    </div>
                </div>
            </div>
            <div className="footerBottomSection flex">
                <p className="footerBottomSectionText">Joyas1945 COPYRIGHT - © 2024. TODOS LOS DERECHOS RESERVADOS. </p>
                <a className={`footerBottomSectionTextImgLoading ${getColorTransitionClass()}`} href="https://imgloading.com.ar/" target="_blank" rel="noreferrer"> POR IMGLOADING / MARKETING DIGITAL </a>
            </div>
        </div>
    );
}

export default Footer;
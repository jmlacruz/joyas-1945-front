import { Link, useLocation, useNavigate } from "react-router-dom";
import "./footer.css";

function Footer() {

    const location = useLocation();
    const navigate = useNavigate();
    const getColorTransitionClass = () => location.pathname.includes("landing") ? "opcionHoverBlueTransition" : "opcionHoverPinkTransition";
    const isLanding = location.pathname.startsWith("/landing");

    const resolveRoute = (path: "/faqs" | "/contact" | "/micuenta") => {
        if (!isLanding) return path;
        if (path === "/faqs") return "/landing/faqs";
        if (path === "/contact") return "/landing/contact";
        return path; // No landing route for /micuenta; keep base path
    };

    const handleCategoryClick = (name: string) => {
        navigate("/home?page=1", { state: { footerCategoryName: name } });
    };
    
    return (
        <div className="footerCont flex column">
            <div className="footerTopSection flex">
                <div className="footerTopSectionLogoCont flex">
                    <img width={200} src="/images/logos/logo_black.png" alt="Logo" />
                </div>
                <div className="footerTopSectionJewelryCont flex column">
                    <p className="footerTopSectionJewelryCont_Title">Joyería</p>
                    <div className="footerTopSectionJewelryCont_sections flex">
                        <button className={getColorTransitionClass()} type="button" onClick={() => handleCategoryClick("Anillos")}>Anillos</button>
                        <button className={getColorTransitionClass()} type="button" onClick={() => handleCategoryClick("Aros")}>Aros</button>
                        <button className={getColorTransitionClass()} type="button" onClick={() => handleCategoryClick("Colgantes")}>Colgantes</button>
                        <button className={getColorTransitionClass()} type="button" onClick={() => handleCategoryClick("Conjunto")}>Conjunto</button>
                        <button className={getColorTransitionClass()} type="button" onClick={() => handleCategoryClick("Gargantillas")}>Gargantillas</button>
                    </div>
                </div>
                <div className="footerTopSectionJewelryCont flex column">
                    <p className="footerTopSectionJewelryCont_Title">Sitemap</p>
                    <div className="footerTopSectionJewelryCont_sections flex">
                        <Link className={getColorTransitionClass()} to={resolveRoute("/faqs")}>Faqs</Link>
                        <Link className={getColorTransitionClass()} to={resolveRoute("/contact")}>Contacto</Link>
                        <Link className={getColorTransitionClass()} to={resolveRoute("/micuenta")}>Mi Cuenta</Link>
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
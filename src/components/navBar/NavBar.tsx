import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useBrands } from "../../context/brandsContext";
import UserPanel from "../userPanel/UserPanel";
import "./navBar.css";

const NavBar = () => {
   
    const thisLocation = useLocation();
    const navigate = useNavigate();
    const { brands, activeBrandId, selectBrand } = useBrands();
    const isHomePage = thisLocation.pathname === "/" || thisLocation.pathname.startsWith("/home");
        
    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo({top: 0, behavior: "smooth"});
    }, [thisLocation.pathname]);

    const isProductDetailInSmartPhone = () => {
        const actualLocation = thisLocation.pathname;
        return actualLocation.includes("productDetail") && window.innerWidth < window.innerHeight;
    };
    
    return (
        <div className="contMenu contMenu_simplified flex opacityOnCharge">
            {isProductDetailInSmartPhone() ? (
                <div className="navBarContLogo navBarContLogo_left flex" onClick={() => navigate("/home")}>
                    <p className="isProductDetailInSmartPhone_return">&#10094; <span>Volver</span></p>
                </div>
            ) : (
                <Link to="/" className="navBarContLogo navBarContLogo_left flex">
                    <img src="/images/logos/logo_black.png" alt="Logo Joyas 1945" className="navBarLogo" />
                </Link>
            )}

            {/* Brand Tabs - only visible on Home page and when brands are loaded */}
            {isHomePage && brands.length > 0 && (
                <nav className="navBar_brandTabs" aria-label="Navegación de marcas">
                    {brands.map((brand) => {
                        const isActive = brand.id.toString() === activeBrandId;
                        return (
                            <button
                                key={brand.id}
                                type="button"
                                className={`navBar_brandTab ${isActive ? "navBar_brandTab--active" : ""}`}
                                onClick={() => selectBrand(brand.id.toString())}
                                aria-current={isActive ? "true" : undefined}
                            >
                                {brand.descripcion}
                            </button>
                        );
                    })}
                </nav>
            )}

            <UserPanel isMenuHidden={true} />
        </div>
    );  
};   

export default NavBar;

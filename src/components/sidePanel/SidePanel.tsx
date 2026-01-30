import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./sidePanel.css";

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const ANIMATION_DURATION = 280; // ms, matches CSS

function SidePanel({ isOpen, onClose }: SidePanelProps) {
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Handle open/close transitions
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsClosing(false);
        } else if (isVisible) {
            // Start closing animation
            setIsClosing(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setIsClosing(false);
            }, ANIMATION_DURATION);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isVisible]);

    // Handle body scroll lock - separate effect for clean lifecycle
    useEffect(() => {
        if (isOpen) {
            // Store original value and lock scroll
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            
            // Cleanup: always restore on unmount or when isOpen becomes false
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        closeButtonRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isVisible) return null;

    return (
        <div 
            className={`sidePanel_overlay ${isClosing ? "sidePanel_overlay--closing" : ""}`}
            onClick={handleOverlayClick}
            aria-hidden="true"
        >
            <div 
                className={`sidePanel_container ${isClosing ? "sidePanel_container--closing" : ""}`}
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Menú de navegación"
            >
                <button
                    className="sidePanel_closeBtn"
                    onClick={onClose}
                    ref={closeButtonRef}
                    type="button"
                    aria-label="Cerrar menú"
                >
                    <span className="sidePanel_closeIcon">&times;</span>
                </button>

                <nav className="sidePanel_nav">
                    <button 
                        className="sidePanel_navItem" 
                        onClick={() => handleNavigation("/faqs")}
                        type="button"
                    >
                        PREGUNTAS FRECUENTES
                    </button>
                    <button 
                        className="sidePanel_navItem" 
                        onClick={() => handleNavigation("/como")}
                        type="button"
                    >
                        CÓMO FUNCIONA
                    </button>
                    <button 
                        className="sidePanel_navItem" 
                        onClick={() => handleNavigation("/blog")}
                        type="button"
                    >
                        BLOG
                    </button>
                    <button 
                        className="sidePanel_navItem" 
                        onClick={() => handleNavigation("/contact")}
                        type="button"
                    >
                        CONTÁCTENOS
                    </button>

                    <div className="sidePanel_social">
                        <Link 
                            to="https://facebook.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="sidePanel_socialLink"
                            aria-label="Facebook"
                            onClick={onClose}
                        >
                            <img 
                                src="/images/icons/facebook_pink.png" 
                                alt="Facebook" 
                                className="sidePanel_socialIcon"
                            />
                        </Link>
                        <Link 
                            to="https://instagram.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="sidePanel_socialLink"
                            aria-label="Instagram"
                            onClick={onClose}
                        >
                            <img 
                                src="/images/icons/instagram_pink.png" 
                                alt="Instagram" 
                                className="sidePanel_socialIcon"
                            />
                        </Link>
                    </div>
                </nav>
            </div>
        </div>
    );
}

export default SidePanel;

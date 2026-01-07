import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { clearUser, setUser } from "../../features/userSlice";
import { usersLogs } from "../../services/database";
import { clearSessionOfLocalStorage, saveSessionDataInLocalStorage } from "../../services/localStorage";
import { loginUser } from "../../services/log";
import { LoginData, SessionUserData } from "../../types";
import { swalPopUp } from "../../utils/swal";
import { getClientDevice, getClientDeviceInfo, getClientIP } from "../../utils/utils";
import CustomButton2 from "../buttons/customButton2/CustomButton2";
import "./loginComponent.css";

function LoginComponent () {
    const dispatch = useDispatch();
    const [loginData, setLoginData] = useState <LoginData> ({
        email: "",
        password: "",
        rememberme: false,
    });
    
    useEffect(() => {
        const loginInputs = document.querySelectorAll(".loginInput") as NodeListOf <HTMLInputElement>;
        loginInputs.forEach((input) => input.addEventListener("focusin", (e) => {                                                   //Cammbio de clases en inputs de login cuando hacemos focus
            const input = e.target as HTMLInputElement;
            const container = input.parentNode;
            const loginInputBorderBottomFocus = container?.querySelector(".loginInputBorderBottomFocus") as HTMLDivElement;
            loginInputBorderBottomFocus.classList.add("loginInputBorderBottomFocusOn");
            const loginInputUserCont = container?.querySelector(".loginInputUserCont") as HTMLDivElement;
            loginInputUserCont.classList.add("loginInputUserContTranslateY");
            const loginInputText = container?.querySelector(".loginInputText") as HTMLParagraphElement;
            loginInputText.classList.add("loginInputTextColorOn");
            const loginUserIcon = container?.querySelector(".loginUserIcon") as HTMLImageElement;
            loginUserIcon.src.includes("user") ? loginUserIcon.src = "/images/icons/user_pink.png" : loginUserIcon.src = "/images/icons/key_pink.png";
        }));

        loginInputs.forEach((input) => input.addEventListener("focusout", (e) => {                                                  //Cammbio de clases en inputs de login cuando dejamos de hacer focus
            const input = e.target as HTMLInputElement;
            if (input.value !== "") return;
            const container = input.parentNode;
            const loginInputBorderBottomFocus = container?.querySelector(".loginInputBorderBottomFocus") as HTMLDivElement;
            loginInputBorderBottomFocus.classList.remove("loginInputBorderBottomFocusOn");
            const loginInputUserCont = container?.querySelector(".loginInputUserCont") as HTMLDivElement;
            loginInputUserCont.classList.remove("loginInputUserContTranslateY");
            const loginInputText = container?.querySelector(".loginInputText") as HTMLParagraphElement;
            loginInputText.classList.remove("loginInputTextColorOn");
            const loginUserIcon = container?.querySelector(".loginUserIcon") as HTMLImageElement;
            loginUserIcon.src.includes("user") ? loginUserIcon.src = "/images/icons/user.png" : loginUserIcon.src = "/images/icons/key.png";
        }));
    }, []);

    const checkOn = (e: React.MouseEvent) => {                                                                                      //Manejo del checkbox desde su texto 
        const text = e.target as HTMLParagraphElement;
        const container = text.parentNode;
        const loginCheckBox = container?.querySelector(".loginCheckBox") as HTMLInputElement;
        loginCheckBox.checked ? setLoginData((currentData) => ({...currentData, rememberme: false})) : setLoginData((currentData) => ({...currentData, rememberme: true}));
    };

    const handleCheckChange = (e: React.ChangeEvent) => {                                                                           //Manejo del checkbox desde su input
        const input = e.target as HTMLInputElement;
        setLoginData((currentData) => ({...currentData, [input.name]: input.checked}));
    };

    const handleInputChange = (e: React.ChangeEvent) => {
        const input = e.target as HTMLInputElement;
        setLoginData((currentData) => ({...currentData, [input.name]: input.value}));
    };

    const login = async () => {
        const response = await loginUser(loginData);
        if (response.success && response.data) {
            const sessionData = response.data as SessionUserData;
            saveSessionDataInLocalStorage(sessionData);
            localStorage.setItem("webtoken", sessionData.token);
            dispatch(setUser(sessionData));
        } else {
            const userIP = await getClientIP();                                                                                                                 //Log de usuario con error de ingreso (email y/o contraseña incorrectos)
            const deviceInfo = getClientDeviceInfo();
            const device = getClientDevice();
            await usersLogs({userIP: userIP || "", deviceInfo, device, loginError: {email: loginData.email, password: loginData.password}, origin: "Web"});    //Solo ponemos el objeto "loginError" si hay error de login, de lo contrario no ponemos nada

            clearSessionOfLocalStorage();
            localStorage.removeItem("webtoken");
            dispatch(clearUser());
            swalPopUp("Error", response.message, "error");                                            
        }
    };
        
    return (
        <div className="loginCont flex column">
            <div className="loginRegisterCont flex">
                <p className="loginRegisterText">¿NO TIENE CUENTA AUN?</p>
                <Link to="/registro">
                    {/* Fix mobile Registro - Walt */}  
                    <button className="customButton1 flex">Registrarse</button>
                </Link>
            </div>
            <p className="loginTitle">Entrar a tu Cuenta</p>
            <p className="loginSubTitle">Inicia sesión y descubre todas las últimas novedades de Joyas1945.</p>
            <div className="loginInputCont">
                <div className="loginInputUserCont flex">
                    <img src="/images/icons/user.png" alt="User" className="loginUserIcon"/>
                    <p className="loginInputText">Correo Electrónico</p>
                </div>
                <input type="email" className="loginInput" name="email" onChange={handleInputChange} value={loginData.email}/>
                <div className="loginInputBorderBottomFocus"></div>
            </div>
            <div className="loginInputCont">
                <div className="loginInputUserCont flex">
                    <img src="/images/icons/key.png" alt="User" className="loginUserIcon"/>
                    <p className="loginInputText">Contraseña</p>
                </div>
                <input type="password" className="loginInput" name="password" onChange={handleInputChange} value={loginData.password}/>
                <div className="loginInputBorderBottomFocus"></div>
            </div>
            <div className="loginCheckBoxcont flex">
                <input type="checkbox" className="loginCheckBox" name="rememberme" onChange={handleCheckChange} checked={loginData.rememberme}/>
                <p className="loginCheckText" onClick={checkOn}>Mantenerme Logueado</p>
            </div>
            <div className="loginSendButtonCont flex">
                <CustomButton2 text="ENTRAR" styles={{width: "6rem", marginRight: "1rem"}} onClickFunction={login}/>
                <Link to="/recoveryPassword">
                    <p className="opcionHoverPinkTransition loginLostPassword">¿Olvidó su contraseña?</p>
                </Link>
            </div>
        </div>
    );
}

export default LoginComponent;
import { Analytics } from "@vercel/analytics/react";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { StreamChat } from "stream-chat";
import BuyActivityPopUp from "./components/buyActivityPopUp/BuyActivityPopUp";
import Footer from "./components/footer/Footer";
import LandingNavBar from "./components/landing/landingNavBar/LandingNavBar";
import NavBar from "./components/navBar/NavBar";
import OrderHTML from "./components/orderForMail/OrderHTML";
import { BrandsProvider } from "./context/brandsContext";
import { SpinnerContext } from "./context/spinnerContext";
import { StreamChatContext } from "./context/streamChatContext";
import { updateCart } from "./features/cartSlice";
import { clearUser } from "./features/userSlice";
import { useSessionManager } from "./hooks/useSessionManager";
import Blog from "./pages/blog/Blog";
import Cart from "./pages/cart/Cart";
import Contact from "./pages/contact/Contact";
import Faqs from "./pages/faqs/Faqs";
import FinalizedPurchase from "./pages/finalizedPurchased/FinalizedPurchase";
import Home from "./pages/home/Home";
import HowWorking from "./pages/howWorking/HowWorking";
import Landing from "./pages/landing/home/Landing";
import New from "./pages/landing/new/New";
import News from "./pages/landing/news/News";
import Reviews from "./pages/landing/reviews/Reviews";
import LoginPage from "./pages/loginPage/LoginPage";
import MyAccount from "./pages/myAccount/MyAccount";
import Note from "./pages/note/Note";
import RecoveryPassword from "./pages/recoveryPassword/RecoveryPassword";
import Register from "./pages/register/Register";
import { getCart, saveCart } from "./services/database";
import { clearSessionOfLocalStorage, getSessionOfLocalStorage } from "./services/localStorage";
import { sendActivityToChat } from "./services/streamChat";
import { RootState } from "./store";
import "./styles/generalStyles.css";
import { ActivityData, CartDataFromDB, LastSessionTimestamp, StreamChatMessage } from "./types";
import { SpinnerContextType } from "./types/spinner";
import { isValidJSON } from "./utils/utils";

function App () {
    return (
        <BrowserRouter>
            <MainApp /> 
            <Analytics/>
        </BrowserRouter>
    );
}

function MainApp () {
    const dispatch = useDispatch();
    const { spinner, showSpinner } = useContext <SpinnerContextType> (SpinnerContext);
    const { registered, email, userId, streamChatToken, name, lastName, city } = useSelector((state: RootState) => state.user.value);
    const cart = useSelector((state: RootState) => state.cart.value);
    const [cartFromDbIsRead, setCartFromDbIsRead]= useState (false);
    const [buyActivityPopUp, setBuyActivityPopUp] = useState <JSX.Element | null> (null);
    const { streamChat } = useContext(StreamChatContext);
    const location = useLocation();    
    const connectToStream = useRef(false);
    const [searchParams] = useSearchParams();
    
    // Usar el hook de gestión de sesiones
    const queryToken = searchParams.get("token");
    const { initializeSession } = useSessionManager(queryToken);
    
    // Inicializar sesión al cargar la aplicación
    useEffect(() => {
        const initialize = async () => {
            await initializeSession();
        };
        initialize();
    }, [queryToken]);
    
    useEffect(() => {                                                                                                          //Guardamos el carrito en la base de datos cuando este se modifica
        if (!cartFromDbIsRead) return;                                                                                         //Solo lo guardamos en la base de datos si se leyo antes de la misma   
        (async () => {
            await saveCart({ userEmail: email, cartData: cart });
        })();
    }, [cart, cartFromDbIsRead]);    

    const isPopUp = () => {
        const buyActivityPopUpCont = document.querySelector(".buyActivityPopUpCont") as HTMLDivElement;
        return buyActivityPopUpCont ? true : false;
    };

    const sendActivity = async () => {
        const response = sendActivityToChat({
            activityType: "enter",
            itemDescription: "",
            itemImgSrc: "",
            userEmail: email,
            userCity: city,
            productID: 0,
            streamChatChannel: streamChat.channel,
            timestamp: Date.now(),
            userLastName: lastName,
            userName: name,
            total: 0,
        });
        return response;
    };
           
    useEffect(() => {    

        (async() => {                                                                                                           //Obtención de mensajes del chat de actividad de compra
            if (!registered || connectToStream.current) return;
            connectToStream.current = true;
            
            if (process.env.REACT_APP_SEND_STREAM_CHAT_GLOBAL_NOTIFICATION) {                                    
                try {
                    const client = StreamChat.getInstance("p75kvc6t5m5j");
                    await client.connectUser(
                        {
                            id: userId,
                            name: email,
                        },
                        streamChatToken,
                    );
                    const channel = client.channel("global", "notifications");
                    await channel.watch();

                    streamChat.channel = channel;                                                                               //Seteamos el contexto para compartir el canal de chat en otros componentes

                    channel.on("message.new", event => {
                        if (!event.message || !event.message.text) return;
                        const dataJSON = event.message.text;
                        const dataOBJ: StreamChatMessage = JSON.parse(dataJSON);
                        if (dataOBJ.type === "buy") {
                            const activityData: ActivityData = dataOBJ.data;
                            if (isPopUp() || activityData.userEmail.trim() === email.trim()) return;                            //Si el mail de origen de la actividad de compra es el nuestro no mostramos el popup         
                            setBuyActivityPopUp(<BuyActivityPopUp itemDescription={activityData.itemDescription} itemImgSrc={activityData.itemImgSrc} userCity={activityData.userCity} userEmail={email} productID={activityData.productID} closePopUp={() => setBuyActivityPopUp(null)}/>);
                        }
                    });
                                                      
                } catch (err) {
                    err instanceof Error ? console.error(err.message) : console.error(err) ;
                }
            }
        })();
              
        /********************************************/

        (async () => {                                                                                                                  //Carga de carrito al loguearse
            if (!registered) return;
            
            const response = await getCart({ userEmail: email });
            if (response.success && response.data.length) {
                const cardDataFromDB: CartDataFromDB = response.data[0];
                const cartItemsJSON = cardDataFromDB?.cart || [];
                const cartItemsOBJ = typeof cartItemsJSON === "string" ? JSON.parse(cartItemsJSON) : cartItemsJSON;
                dispatch(updateCart({cartItems: cartItemsOBJ, generalObservation: cardDataFromDB.generalObservation || ""}));
                setCartFromDbIsRead(true);                                                              //Indicamos que ya se leyó el carrito 
            } else if (response.success && !response.data.length) {                                     //No se encontró el carrito    
                dispatch(updateCart({cartItems: [], generalObservation: ""}));
                setCartFromDbIsRead(true); 
            } else if (!response.success) {
                console.error(response.message);
                setCartFromDbIsRead(false);      
                showSpinner(false);                                           
            }
        })();
    }, [registered]);

            


    useEffect(() => {
        (async () => {
            if (!streamChat?.channel) return;
            if (!registered) {                                                                                                 //Al desloguearse permitimos el evento de login devuelta aunque no hayan pasado 5 minutos
                localStorage.removeItem("lastSessionTimestamp");
                clearSessionOfLocalStorage();
                localStorage.removeItem("webtoken");
                dispatch(clearUser());
                return;
            }
            const lastSessionTimestampJSON = localStorage.getItem("lastSessionTimestamp");                                     //Evento de login por websockets para que lo tome el dashboard
            if (lastSessionTimestampJSON && isValidJSON(lastSessionTimestampJSON)) {
                const lastSessionTimestampOBJ: LastSessionTimestamp = JSON.parse(lastSessionTimestampJSON);
                const lastSessionTimestamp = lastSessionTimestampOBJ.timestamp;   
                if (Date.now() - lastSessionTimestamp > 300000) {                                                              //300000ms -> 5 minutos  (Solo se puede enviar un evento de login cada 5 minutos)
                    await sendActivity();
                    const lastSessionTimestampOBJ: LastSessionTimestamp = {timestamp: Date.now()};
                    localStorage.setItem("lastSessionTimestamp", JSON.stringify(lastSessionTimestampOBJ));
                }                                                                                             
            } else {
                await sendActivity();
                const lastSessionTimestampOBJ: LastSessionTimestamp = {timestamp: Date.now()};
                localStorage.setItem("lastSessionTimestamp", JSON.stringify(lastSessionTimestampOBJ));
            }
        })();
    }, [registered, streamChat?.channel]);

    const routesFunction = () => {
        const sessionData = getSessionOfLocalStorage();
        const hasToken = localStorage.getItem("webtoken");
        
        // Si hay datos de sesión o token, considerar al usuario logueado
        // Esto previene deslogeos durante la verificación con el servidor
        const isUserLoggedIn = registered || (sessionData && hasToken);
        
        if (!isUserLoggedIn) {
            return ( 
                <>
                    <Route path="/landing/faqs" element={<Faqs/>}/> 
                    <Route path="/landing/como" element={<HowWorking/>}/> 
                    <Route path="/landing/blog" element={<Blog/>}/> 
                    <Route path="/landing/contact" element={<Contact/>}/> 
                    <Route path="/faqs" element={<Faqs/>}/> 
                    <Route path="/como" element={<HowWorking/>}/> 
                    <Route path="/blog" element={<Blog/>}/> 
                    <Route path="/contact" element={<Contact/>}/> 
                    <Route path="/registro" element={<Register/>}/>
                    <Route path="/recoveryPassword" element={<RecoveryPassword/>}/>
                    <Route path="*" element={<LoginPage/>}/>
                </>
            );
        } else {
            return  (
                <>
                    <Route path="/home" element={<Home/>}/> 
                    <Route path="/faqs" element={<Faqs/>}/> 
                    <Route path="/como" element={<HowWorking/>}/> 
                    {(!cartFromDbIsRead || cart.cartItems.length) && <Route path="/cart" element={<Cart/>}/>}
                    <Route path="/blog" element={<Blog/>}/> 
                    <Route path="/contact" element={<Contact/>}/> 
                    <Route path="/micuenta" element={<MyAccount/>}/> 
                    <Route path="/nota/:noteId" element={<Note/>}/> 
                    <Route path="/finalizedPurchase" element={<FinalizedPurchase/>}/> 
                    <Route path="/order" element={<OrderHTML/>}/> 
                    <Route path="*" element={<Navigate to="/home"/>}/>            
                </>
            );
        }
    };

    const getNavBar = () => location.pathname.includes("landing") ? <LandingNavBar/> : <NavBar/>;
  
    return (
        <BrandsProvider>
            {buyActivityPopUp}
            {spinner}
            {getNavBar()}
            <Routes>
                {routesFunction()}
                <Route path="/landing" element={<Landing/>}/>
                <Route path="/landing/news" element={<News/>}/>
                <Route path="/landing/reviews" element={<Reviews/>}/>
                <Route path="/landing/novedad/:slug" element={<New/>}/>
            </Routes>
            <Footer/>
        </BrandsProvider>
    );
}

export default App;

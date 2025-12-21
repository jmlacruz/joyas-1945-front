import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearUser, setUser } from "../features/userSlice";
import { checkCart } from "../services/cron";
import { usersLogs } from "../services/database";
import { clearSessionOfLocalStorage, getSessionOfLocalStorage, saveSessionDataInLocalStorage } from "../services/localStorage";
import { isLogged, logOut } from "../services/log";
import { RootState } from "../store";
import { SessionUserData } from "../types";
import { getClientDevice, getClientDeviceInfo, getClientIP } from "../utils/utils";

export const useSessionManager = (queryToken?: string | null) => {
    const dispatch = useDispatch();
    const { registered, rememberme, email } = useSelector((state: RootState) => state.user.value);
    const isInitialized = useRef(false);
    const beforeUnloadHandler = useRef<(() => Promise<void>) | null>(null);
    const previousRegisteredState = useRef(registered);

    // Función centralizada de logout mejorada
    const performLogout = useCallback(async (shouldCheckCart = true) => {
        try {
            
            try {
                await logOut();
            } catch (error) {
                console.warn("Error al hacer logout en el servidor:", error);
            }
        } catch (error) {
            console.error("Error durante el proceso de logout:", error);
            // Asegurar limpieza mínima en caso de error
            clearSessionOfLocalStorage();
            localStorage.removeItem("webtoken");
            dispatch(clearUser());
        }
    }, [email, dispatch]);

    // Función para registrar entrada del usuario
    const logUserEntry = useCallback(async () => {
        if (registered) {
            try {
                const userIP = await getClientIP();
                const deviceInfo = getClientDeviceInfo();
                const device = getClientDevice();
                await usersLogs({ userIP: userIP || "", deviceInfo, device, origin: "Web" });
                console.log("Entrada del usuario registrada exitosamente");
            } catch (error) {
                console.warn("Error al registrar entrada del usuario:", error);
            }
        }
    }, [registered]);

    // Función para inicializar sesión
    const initializeSession = useCallback(async () => {
        try {
            
            // Verificación de sesión al recargar o entrar en la web
            const sessionData = getSessionOfLocalStorage();
            const hasToken = localStorage.getItem("webtoken");
            
            // Si tenemos datos de sesión local, cargarlos primero
            if (sessionData) {
                console.log("Cargando datos de sesión desde localStorage");
                dispatch(setUser(sessionData));
            }
            
            // Si viene un token por query parameter, usarlo
            if (queryToken) {
                console.log("Estableciendo token desde query parameter");
                localStorage.setItem("webtoken", queryToken);
            }
            
            // Solo verificar con el servidor si tenemos un token
            if (hasToken || queryToken) {
                console.log("Verificando sesión con el servidor...");
                const response = await isLogged({refreshData: true});
                
                if (!response.success) {
                    // Solo limpiar si es un error de autenticación real (no de red)
                    if (response.message?.includes("Token inválido") || 
                        response.message?.includes("No hay token") ||
                        response.message?.includes("401") ||
                        response.message?.includes("403")) {
                        console.log("Token inválido, limpiando sesión");
                        clearSessionOfLocalStorage();
                        localStorage.removeItem("webtoken");
                        dispatch(clearUser());
                    } else if (response.message?.includes("Error de red")) {
                        // Error de red - mantener sesión local si existe
                        console.warn("Error de red al verificar sesión, manteniendo datos locales");
                        if (!sessionData && hasToken) {
                            // Si hay token pero no datos locales, intentar mantener un estado mínimo
                            console.log("Manteniendo estado mínimo debido a error de red");
                        }
                    } else {
                        // Error desconocido - intentar mantener sesión si tenemos datos locales
                        console.warn("Error desconocido al verificar sesión:", response.message);
                        if (!sessionData) {
                            clearSessionOfLocalStorage();
                            localStorage.removeItem("webtoken");
                            dispatch(clearUser());
                        }
                    }
                } else if (response.success && response.data) {
                    // Token válido - actualizar o crear datos de sesión
                    const newSessionData = response.data as SessionUserData;
                    console.log("Sesión verificada exitosamente, actualizando datos");
                    saveSessionDataInLocalStorage(newSessionData);
                    if (newSessionData.token) {
                        localStorage.setItem("webtoken", newSessionData.token);
                    }
                    dispatch(setUser(newSessionData));
                } else if (response.success && !response.data && sessionData) {
                    // Verificación exitosa pero sin datos nuevos - mantener datos locales
                    console.log("Sesión verificada, manteniendo datos locales existentes");
                }
            } else if (!sessionData) {
                // No hay token ni datos de sesión - usuario no logueado
                console.log("No hay token ni datos de sesión, usuario no logueado");
            }
            
        } catch (error) {
            console.error("Error al inicializar sesión:", error);
            
            // Solo limpiar si no tenemos datos de sesión local válidos
            const sessionData = getSessionOfLocalStorage();
            if (!sessionData) {
                clearSessionOfLocalStorage();
                localStorage.removeItem("webtoken");
                dispatch(clearUser());
            } else {
                console.warn("Error al verificar con servidor, manteniendo sesión local");
            }
        }
    }, [queryToken, dispatch]);

    // Manejo del evento beforeunload
    const setupBeforeUnloadHandler = useCallback(() => {
        // Limpiar handler previo
        if (beforeUnloadHandler.current) {
            window.removeEventListener("beforeunload", beforeUnloadHandler.current);
        }

        // Crear nuevo handler solo si es necesario
        if (!rememberme && registered) {
            beforeUnloadHandler.current = async () => {
                await performLogout(true);
            };
            window.addEventListener("beforeunload", beforeUnloadHandler.current);
        }
    }, [rememberme, registered, performLogout]);

    // Effect principal para manejo de sesión
    useEffect(() => {
        if (!isInitialized.current) {
            isInitialized.current = true;
            initializeSession();
        }
    }, [initializeSession]);

    // Effect para detectar cuando el usuario se logea y ejecutar logUserEntry
    useEffect(() => {
        // Solo ejecutar logUserEntry cuando el usuario cambia de no logueado a logueado
        if (registered && !previousRegisteredState.current) {
            logUserEntry();
        }
        
        // Actualizar el estado anterior
        previousRegisteredState.current = registered;
    }, [registered, logUserEntry]);

    // Effect para manejo de beforeunload
    useEffect(() => {
        setupBeforeUnloadHandler();
        
        return () => {
            if (beforeUnloadHandler.current) {
                window.removeEventListener("beforeunload", beforeUnloadHandler.current);
            }
        };
    }, [setupBeforeUnloadHandler]);

    return {
        performLogout,
        initializeSession,
        logUserEntry
    };
};

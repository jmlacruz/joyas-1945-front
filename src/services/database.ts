import { verifyTokenAPIError } from "../data";
import { CartDataForDBFromFront, UsersLogsOrigins } from "../types";
import { Database_CustomResponse, FilterOrderByTypes, Pano, Panoxproducto } from "../types/database";
import { isValidNoEmptyArray } from "../utils/utils";

export const getProductsFiltered = async (options: 
    {
        limit: number, 
        offset: number, 
        fields: string[], 
        condition?: {
            field: string, 
            operator: string, 
            value: string | number
        }, 
        searchWordsArr: string[], 
        categoriesIdsArr: number[]
        priceRangeArr: number[],
        orderBy: FilterOrderByTypes,
        brand: string | number,                                                  //brand puede venir como string o number ya que despues se pone en una query y se vuelve string
    }) : Promise <Database_CustomResponse> => {
    try {
        const fieldsJSON = JSON.stringify(options.fields);
        const conditionJSON = options.condition ? JSON.stringify(options.condition) : "";
        const searchWordsJSON = options.searchWordsArr && options.searchWordsArr.length && Array.isArray(options.searchWordsArr) ? JSON.stringify(options.searchWordsArr) : JSON.stringify([]);
        const categoriesIdsArrJSON = options.categoriesIdsArr && options.categoriesIdsArr.length && Array.isArray(options.categoriesIdsArr) ? JSON.stringify(options.categoriesIdsArr) :  JSON.stringify([]);
        const priceRangeArrJSON = options.priceRangeArr && options.priceRangeArr.length && Array.isArray(options.priceRangeArr) ? JSON.stringify(options.priceRangeArr) : JSON.stringify([]);
        const brandStr = typeof options.brand === "number" ? options.brand.toString() : options.brand;
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/getProductsFiltered?limit=${options.limit}&fields=${encodeURIComponent(fieldsJSON)}&offset=${options.offset}&condition=${encodeURIComponent(conditionJSON)}&searchWords=${encodeURIComponent(searchWordsJSON)}&categories=${encodeURIComponent(categoriesIdsArrJSON)}&priceRange=${encodeURIComponent(priceRangeArrJSON)}&orderBy=${options.orderBy}&brand=${encodeURIComponent(brandStr)}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            }
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        if (responseOBJ.message.includes(verifyTokenAPIError)) window.location.reload();                        //Recarga de página por si el token esta expirado (De lo contrario, si hay un spinner, por ejemplo al entrar en detalle de un producto, el spinner no se cierra)
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

export const getProductsFilteredRowsQuantity = async (options: 
    {
        condition?: {
            field: string,
            operator: string,
            value: string | number
        },
        searchWordsArr: string[],
        categoriesIdsArr: number[],
        priceRangeArr: number[],
        brand: string,
    }) : Promise <Database_CustomResponse> => {
    const conditionJSON = options.condition ? JSON.stringify(options.condition) : "";
    const searchWordsJSON = options.searchWordsArr && options.searchWordsArr.length && Array.isArray(options.searchWordsArr) ? JSON.stringify(options.searchWordsArr) : JSON.stringify([]);
    const categoriesIdsArrJSON = options.categoriesIdsArr && options.categoriesIdsArr.length && Array.isArray(options.categoriesIdsArr) ? JSON.stringify(options.categoriesIdsArr) : JSON.stringify([]);
    const priceRangeArrJSON = options.priceRangeArr && options.priceRangeArr.length && Array.isArray(options.priceRangeArr) ? JSON.stringify(options.priceRangeArr) : JSON.stringify([]);
    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/getProductsFilteredRowsQuantity?condition=${encodeURIComponent(conditionJSON)}&searchWords=${encodeURIComponent(searchWordsJSON)}&categories=${encodeURIComponent(categoriesIdsArrJSON)}&priceRange=${encodeURIComponent(priceRangeArrJSON)}&brand=${encodeURIComponent(options.brand)}`, { 
            method: "GET",        
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            }
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        if (responseOBJ.message.includes(verifyTokenAPIError)) window.location.reload();                        //Recarga de página por si el token esta expirado (De lo contrario, si hay un spinner, por ejemplo al entrar en detalle de un producto, el spinner no se cierra)
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

// Obtención de tabla: si nó se especifican los campos requeridos se traen todos, la condición es opcional
export const getTable = async (options :{tableName: string, fields?: string[], conditions?: {field: string, value: string | number}[], limit?: number, offset?: number, orderBy?: {field: string, order: "asc" | "desc"}, count?: boolean}): Promise <Database_CustomResponse> => {       

    const conditionJSON = options.conditions ? JSON.stringify(options.conditions) : "";
    const fieldsArrJSON = isValidNoEmptyArray(options.fields) ? JSON.stringify(options.fields) : "";
    const countJSON = options.count === false || options.count === true ? JSON.stringify(options.count) : "";
    const limitStr = typeof options.limit === "number" ? options.limit.toString() : "";  
    const offsetStr = typeof options.offset === "number" ? options.offset.toString() : "";
    const orderByJSON = options.orderBy ? JSON.stringify(options.orderBy) : "";

    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/getTable?tableName=${options.tableName}&fields=${fieldsArrJSON}&condition=${conditionJSON}&count=${countJSON}&offset=${offsetStr}&limit=${limitStr}&orderBy=${orderByJSON}`,{
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            }
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        if (responseOBJ.message.includes(verifyTokenAPIError)) window.location.reload();                        //Recarga de página por si el token esta expirado (De lo contrario, si hay un spinner, por ejemplo al entrar en detalle de un producto, el spinner no se cierra)
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

export const getProductByID = async (productID: number): Promise <Database_CustomResponse> => {
    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/getProductByID?id=${productID}`,{
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            }
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        if (responseOBJ.message.includes(verifyTokenAPIError)) window.location.reload();                        //Recarga de página por si el token esta expirado (De lo contrario, si hay un spinner, por ejemplo al entrar en detalle de un producto, el spinner no se cierra)
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

export const getProductsByIDs = async (options: {iDsArr: number[], fieldsArr: string[]}): Promise <Database_CustomResponse> => {

    const iDsArrJSON = isValidNoEmptyArray(options.iDsArr) ? JSON.stringify(options.iDsArr) : JSON.stringify([]);
    const fieldsArrJSON = isValidNoEmptyArray(options.fieldsArr) ? JSON.stringify(options.fieldsArr) :  JSON.stringify([]);

    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/getProductsByIDs?ids=${iDsArrJSON}&fileds=${fieldsArrJSON}`,{
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            }
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        if (responseOBJ.message.includes(verifyTokenAPIError)) window.location.reload();                        //Recarga de página por si el token esta expirado (De lo contrario, si hay un spinner, por ejemplo al entrar en detalle de un producto, el spinner no se cierra)
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

export const updateTable = async (options: {tableName: string, conditions: {field: string, value: string | number}[], data: any}): Promise <Database_CustomResponse> => {

    const conditionJSON = options.conditions ? JSON.stringify(options.conditions) : "";

    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/updateTable?tableName=${options.tableName}&condition=${conditionJSON}`,{
            method: "PUT",
            body: JSON.stringify(options.data),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            },
            credentials: "include"
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

export const createUser = async (options: {data: any}): Promise <Database_CustomResponse> => {

    if (!options.data || typeof options.data !== "object") options.data = {};

    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/createUser`,{
            method: "POST",
            body: JSON.stringify(options.data),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            },
            credentials: "include"
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

export const saveCart = async (options: CartDataForDBFromFront): Promise <Database_CustomResponse> => {

    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/saveCart`,{
            method: "POST",
            body: JSON.stringify(options),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            },
            credentials: "include"
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        if (responseOBJ.message.includes(verifyTokenAPIError)) window.location.reload();                        //Recarga de página por si el token esta expirado (De lo contrario, si hay un spinner, por ejemplo al entrar en detalle de un producto, el spinner no se cierra)
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

export const getCart = async (options: {userEmail: string}): Promise <Database_CustomResponse> => {

    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/getCart?userEmail=${options.userEmail}`,{
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            }
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        if (responseOBJ.message.includes(verifyTokenAPIError)) window.location.reload();                        //Recarga de página por si el token esta expirado (De lo contrario, si hay un spinner, por ejemplo al entrar en detalle de un producto, el spinner no se cierra)
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
}; 


/************************* Obtención de datos de Paños ***************************/

export const getPanoByProductId = async (productId: number) => {
    const response4 = await getTable({ tableName: "pano" });
    const response5 = await getTable({ tableName: "panoxproducto" });
   
    if (response4.success && response5.success) {
        const panosData: Pano[] = response4.data;
        const panosXProductoData: Panoxproducto[] = response5.data;
        const idPano = panosXProductoData.find((panoxproducto: Panoxproducto) => panoxproducto.id_producto === productId)?.id_pano;
        if (!idPano) return "";
        const panoName = panosData.find((pano: Pano) => pano.id === idPano)?.nombre;
        if (!panoName) return "";
        return panoName;
    } else {
        return "";
    }
};

//Solo enviamos "loginError: true" si hay error de login, de lo contrario no ponemos nada
export const usersLogs = async (data: {userIP: string, deviceInfo: string, device: string, loginError?: {email: string, password: string}, origin: UsersLogsOrigins}): Promise <Database_CustomResponse> => {
    const {userIP, deviceInfo, device, loginError, origin} = data;

    const logEndPoint = loginError ? "loginError" : "usersLogs";

    try {
        const responseJSON = await fetch(`${process.env.REACT_APP_API_URL}/db/${logEndPoint}`,{
            method: "POST",
            body: JSON.stringify({userIP, deviceInfo, device, loginError, origin}),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("webtoken")}`,
            },
            credentials: "include"
        });
        const responseOBJ: Database_CustomResponse = await responseJSON.json();
        return responseOBJ;

    } catch (err) {
        const message = err instanceof Error ? "ERROR: " + err.message : "ERROR: " + err;
        return {success: false, message: `Error al conectarse a la base de Datos: ${message}`, data: null};
    }
};

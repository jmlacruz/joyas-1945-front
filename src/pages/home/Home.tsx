import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import ProductCard from "../../components/cards/product/Product";
import ProductDetailModal from "../../components/productDetailModal/ProductDetailModal";
import { SpinnerContext } from "../../context/spinnerContext";
import { StreamChatContext } from "../../context/streamChatContext";
import { getProductsFiltered, getProductsFilteredRowsQuantity, getTable } from "../../services/database";
import { sendActivityToChat } from "../../services/streamChat";
import { RootState } from "../../store";
import { FiltersStatus, QuerysData } from "../../types";
import { FilterOrderByTypes, Marca, Multiplicador, Pano, Panoxproducto, Producto } from "../../types/database";
import { isValidJSON, parseFilterQuerys, showElement } from "../../utils/utils";

import { setDolar } from "../../features/userSlice";
import "./home.css";
 
const useQuery = () => new URLSearchParams(useLocation().search);                                                   //Función para leer querys de url

function Home() {

    const firstTime = useRef(true);
    const firstTimeShownFilters = useRef(true);
    const firstRenderForSpinner = useRef(true);
    const thisLocation = useLocation();
    const navigate = useNavigate();
    const quantityOfPages = useRef(0);
    const [brands, setBrands] = useState <JSX.Element[]> ([]);
    const [bgBrandImageSrc, setBgBrandImageSrc] = useState("");
    const {showSpinner} = useContext(SpinnerContext);
    const [currentBrandImageSrc, setCurrentBrandImageSrc] = useState ("");
    const [products, setProducts] = useState <JSX.Element[] | null> (null);
    const [productsData, setProductsData] = useState<Producto[] | null>(null);
    const [categories, setCategories] = useState <JSX.Element[]> ([]);
    const [productsFound, setProductsFound] = useState <number> (0);
    const [pagesIndex, setPagesIndex] = useState <JSX.Element[]> ([]); 
    const query = useQuery();                                                                                        //Hook para leer querys de url
    const pageString = query.get("page");
    const searchWordsStr = query.get("searchWords") as string;
    const categoriesArrStr = query.get("categories") as string;
    const priceRangeArrStr = query.get("priceRange") as string;
    const orderBy = query.get("orderBy") as FilterOrderByTypes | "" || "";
    const brandId = query.get("brand") as string || "";
    const resultsByPage = 60;                   //<------- Si se cambia este valor también hay que cambiarlo en el dashboard en "ProductsOrder.page.tsx"
    const panosTables = useRef <{
        pano: Pano[] | null,
        panoxproducto: Panoxproducto[] | null,
    }> ({
        pano: null,
        panoxproducto: null
    });

    const getPano = (productId: number) => {
        if (panosTables.current.pano && panosTables.current.panoxproducto) {
            const idPano = panosTables.current.panoxproducto.find((panoxproducto: Panoxproducto) => panoxproducto.id_producto === productId)?.id_pano;
            if (!idPano) return "";
            const panoName = panosTables.current.pano.find((pano: Pano) => pano.id === idPano)?.nombre;
            if (!panoName) return "";
            return panoName;
        }
        return "";
    };
     
    const searchWordsArrInOBJ: string[] = isValidJSON(searchWordsStr) ? JSON.parse(searchWordsStr) : [];
    const searchWordsArrInJSON = JSON.stringify(searchWordsArrInOBJ);
    const categoriesArrInOBJ = isValidJSON(categoriesArrStr) ? JSON.parse(categoriesArrStr) : [];
    const categoriesArrInJSON = JSON.stringify(categoriesArrInOBJ);
    const priceRangeArrOBJ: number[] = isValidJSON(priceRangeArrStr) ? JSON.parse(priceRangeArrStr) : [];
    const priceRangeArrJSON = JSON.stringify(priceRangeArrOBJ);
    const [priceRange, setPriceRange] = useState <[number, number] | ["", ""] | null> (null);
    const [searchWords, setSearchWords] = useState <string[]> ([]);
    const globalMultiplierRef = useRef (0);
 
    const [searchWordsResults, setSearchWordsResults] = useState <JSX.Element[]> ([]);
    const activeBrandsRef = useRef <Marca[]> ([]);
    const filtersStatus = useRef<FiltersStatus>({
        filtersOpen: false
    });
    const scrollPositionRef = useRef<number>(0);
    const [modalProductID, setModalProductID] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { streamChat } = useContext(StreamChatContext);
    const { email, city, name, lastName, dolar } = useSelector((state: RootState) => state.user.value);
    const dispatch = useDispatch();
    const currencyIsUsd = dolar ?? true;
        
    let pageNumberFromQuery = pageString ? parseInt(pageString) : 1;                                                //Si pageString es un "string" parseInt da NaN, entonces pageNumberFromQuery = NaN (que equivale a false)
    if (!pageNumberFromQuery || pageNumberFromQuery < 1 || pageNumberFromQuery%1 !== 0) pageNumberFromQuery = 1;
    
    const showProductDetails = (productID: number) => {
        setModalProductID(productID);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalProductID(null);
    };
    
    // Funciones para manejar la persistencia del estado
    const saveScrollPosition = () => {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        scrollPositionRef.current = scrollPosition;
        localStorage.setItem("homeScrollPosition", scrollPosition.toString());
    };

    const restoreScrollPosition = () => {
        const savedScrollPosition = localStorage.getItem("homeScrollPosition");
        if (savedScrollPosition) {
            const position = parseInt(savedScrollPosition);
            scrollPositionRef.current = position;
            // Restaurar la posición después de que se hayan cargado los productos
            setTimeout(() => {
                window.scrollTo({
                    top: position,
                    behavior: "smooth"
                });
            }, 100);
        }
    };

    const saveInputsState = () => {
        const homePageFinderSearchInput = document.querySelector(".homePageFinderSearchInput") as HTMLInputElement;
        const filterPriceInputMin = document.querySelector(".filterPriceInputMin") as HTMLInputElement;
        const filterPriceInputMax = document.querySelector(".filterPriceInputMax") as HTMLInputElement;
        
        const inputsState = {
            searchInput: homePageFinderSearchInput?.value || "",
            priceMin: filterPriceInputMin?.value || "",
            priceMax: filterPriceInputMax?.value || "",
            timestamp: Date.now()
        };
        
        localStorage.setItem("homeInputsState", JSON.stringify(inputsState));
    };

    const restoreInputsState = () => {
        const savedInputsState = localStorage.getItem("homeInputsState");
        if (savedInputsState && isValidJSON(savedInputsState)) {
            const inputsState = JSON.parse(savedInputsState);
            
            // Solo restaurar si la información es reciente (menos de 1 hora)
            const hourInMs = 60 * 60 * 1000;
            if (Date.now() - inputsState.timestamp < hourInMs) {
                setTimeout(() => {
                    const homePageFinderSearchInput = document.querySelector(".homePageFinderSearchInput") as HTMLInputElement;
                    const filterPriceInputMin = document.querySelector(".filterPriceInputMin") as HTMLInputElement;
                    const filterPriceInputMax = document.querySelector(".filterPriceInputMax") as HTMLInputElement;
                    
                    if (homePageFinderSearchInput && inputsState.searchInput) {
                        homePageFinderSearchInput.value = inputsState.searchInput;
                    }
                    if (filterPriceInputMin && inputsState.priceMin) {
                        filterPriceInputMin.value = inputsState.priceMin;
                    }
                    if (filterPriceInputMax && inputsState.priceMax) {
                        filterPriceInputMax.value = inputsState.priceMax;
                    }
                }, 100);
            }
        }
    };
    
    useEffect(() => {
        // Solo hacer scroll hacia arriba al cambiar de página, no en la carga inicial
        if (!firstTime.current) {
            window.scrollTo({top: 0, behavior: "smooth"});
        }
    }, [pageNumberFromQuery]);
    
    const querysDataInitial = useRef <QuerysData> (JSON.parse(localStorage.getItem("querysData") || "[]"));         //Al entrar cargamos las querys del filtro en "querysDataInitial"
    
    /********************************************** Persistencia del estado al montar y desmontar *******************************************/
    
    useEffect(() => {
        // Restaurar estado al montar el componente
        restoreInputsState();
        
        // Agregar listeners para guardar estado
        const handleScroll = () => saveScrollPosition();
        const handleBeforeUnload = () => {
            saveScrollPosition();
            saveInputsState();
        };
        
        window.addEventListener("scroll", handleScroll);
        window.addEventListener("beforeunload", handleBeforeUnload);
        
        // Cleanup
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Guardar estado al desmontar
            saveScrollPosition();
            saveInputsState();
        };
    }, []);
    
    /********************************************** Abrimos los filtros si se dejaron abiertos *******************************************/

    useEffect(() => {                                                                                               //Si abrimos el filtro esperamos a que se renderizen las categorias para que el filtro tenga su scrollHeightFinal
        if (!firstTimeShownFilters.current || !categories.length) return;
        firstTimeShownFilters.current = false;        
        const filterStatusJSON = localStorage.getItem("filtersStatus");
        if (!filterStatusJSON) return;
        const filterStatusOBJ: FiltersStatus = JSON.parse(filterStatusJSON);
        if (filterStatusOBJ.filtersOpen) {
            handleShowFilters();
        }
    }, [categories]);
        
    /************************************** Almacenamiento de opciones de filtro en el localstorage **************************************/

    useEffect(() => {
        (async () => {

            if (                                                                                                        //Al cargar la página sin querys no las actualizamos en el localstorage
                !searchWordsArrInOBJ.length
                &&
                !categoriesArrInOBJ.length
                &&
                !priceRangeArrOBJ.length
                &&
                !orderBy
                &&
                !brandId
                &&
                (!pageNumberFromQuery || pageNumberFromQuery === 1)
            ) return;

            const querysData: QuerysData = {                                                                                       //Al cambiar las querys las guardamos en el localstorage
                searchWords: searchWordsArrInOBJ,
                categories: categoriesArrInOBJ,
                priceRange: priceRangeArrOBJ,
                orderBy,
                brandId,
                pageNumberFromQuery
            };

            const data = await parseFilterQuerys(querysData);
            localStorage.setItem("querysData", JSON.stringify(querysData));

            if(JSON.stringify(querysDataInitial.current) === JSON.stringify(querysData)) return;
            querysDataInitial.current = structuredClone(querysData);
            
            if (streamChat && streamChat.channel) {
                sendActivityToChat({
                    userName: name,
                    userLastName: lastName,
                    userCity: city,
                    itemDescription: "",
                    itemImgSrc: "",
                    userEmail: email,
                    productID: 0,
                    timestamp: Date.now(),
                    streamChatChannel: streamChat.channel,
                    activityType: "filter",
                    total: 0,
                    data 
                });
            }
        })();
    }, [thisLocation]);
     
    /*************************************************************************************************************************************/
    
    useEffect(() => {
      
        if (firstRenderForSpinner.current) {
            showSpinner(true);
            firstRenderForSpinner.current = false;
        }


        
        const firstProduct = (pageNumberFromQuery - 1) * resultsByPage;                                                             //firstProduct: A partir de que producto se muestra la página -> si offset = firstProduct = 0 se muestra desde el primero
       
        (async () => {
            
            const resetFilterInputs = () => {
                const productTypeInputs = document.querySelectorAll(".filterCheckBox_hidden") as NodeListOf <HTMLInputElement>;
                const productTypeInputsArr = Array.from(productTypeInputs);
                productTypeInputsArr.forEach(input => input.checked = false);

                const homePageFinderSearchInput = document.querySelector(".homePageFinderSearchInput") as HTMLInputElement;
                homePageFinderSearchInput.value = "";

                const filterPriceInputs = document.querySelectorAll(".filterPriceInput") as NodeListOf <HTMLInputElement>;
                const filterPriceInputsArr = Array.from(filterPriceInputs);
                filterPriceInputsArr.forEach(input => input.value = "");

                const filterByOrderOptionsCont = document.querySelector(".filterOrderOptionsDropDownCont") as HTMLDivElement;
                const filterByOrderOptions = filterByOrderOptionsCont.childNodes as NodeListOf <HTMLParagraphElement>;
                const filterByOrderOptionsArr = Array.from(filterByOrderOptions);
                filterByOrderOptionsArr.forEach(option => option.classList.remove("filterOrderOptionsDropDowSelected"));
                filterByOrderOptionsArr[0].classList.add("filterOrderOptionsDropDowSelected");
            };

            /*********** Obtención del multiplicador de precios ******/

            const response = await getTable({tableName: "multiplicador"});
            const globalMultiplierData: Multiplicador | null = response.success && response.data && response.data.length ? response.data[0] : null;
            const globalMultiplier = globalMultiplierData?.valor || 1;
            globalMultiplierRef.current = globalMultiplier;

            /************** Seteo de selector de marca **************/
            
            const handleSelectBrand = (e: React.MouseEvent) => {
                const currencyBrandImg = document.querySelector(".currencyBrandImg") as HTMLImageElement;
                const brandImgSelected = e.target as HTMLImageElement;
                const brandImgSelectedSrc = brandImgSelected.src;
                currencyBrandImg.src = brandImgSelectedSrc;
                const brandId = brandImgSelected.id;
                resetFilterInputs();
                saveScrollPosition();
                saveInputsState();
                navigate(`/home?page=1&brand=${brandId}`);                                                                  //Al cambiar de marca resetamos todos los filtros
            };

            const response0 = await getTable({tableName: "marca"});                                                         //Obtenemos marcas
            if (!response0.success) return;
            const activeBrands: Marca[] = response0.data.filter((brand: any) => brand.estado === "1");                      //Las marcas activas en la solapa de home tienen el campo "estado" = "1" en tabla "marca"
            activeBrands.sort((a: any, b: any) => a.orden - b.orden);                                                       //Ordenamos las marcas del select por el campo "orden" para ordenarlas en el select
            activeBrandsRef.current = activeBrands;    
            
            const brandSelected = activeBrands.find((brand: any) => brand.id === parseInt(brandId));
            if (brandSelected) {
                setCurrentBrandImageSrc(brandSelected.logo);
                setBgBrandImageSrc(brandSelected.imagen);
            } else {
                setCurrentBrandImageSrc(activeBrands[0].logo);    //Cambiamos la imagen de la marca en el select, por defecto la imagen es la de la primera en la lista. Si hay una id de marca en la query elegimos su imagen corresponiente          
                setBgBrandImageSrc(activeBrands[0].imagen);
            }
                                                                                                                            
            const brandsJSX = activeBrands.map((brand: any, index: number) => 
                <img src={brand.logo} alt={brand.descripcion} id={brand.id} className="brandLogoImg" key={index} onClick={handleSelectBrand}/>          // brand.id es el codigo de la marca que también tienen los productos
            );                                      
            brandsJSX.length ? setBrands(brandsJSX) : setBrands([]);

            /************************** Obtenemos la cantidad de filas que devuelve la busqueda actual ******************************/

            const response1 = await getProductsFilteredRowsQuantity({                                                          
                condition: {
                    field: "estado", 
                    operator: "=", 
                    value: "1"
                }, 
                searchWordsArr: searchWordsArrInOBJ, 
                categoriesIdsArr: categoriesArrInOBJ,
                priceRangeArr: priceRangeArrOBJ.length ? (currencyIsUsd ? [priceRangeArrOBJ[0] * globalMultiplier, priceRangeArrOBJ[1] * globalMultiplier] : [priceRangeArrOBJ[0], priceRangeArrOBJ[1]]) : [],
                brand: brandId || activeBrands[0].id.toString(),
            });               
            const productsFound = response1.data;
            quantityOfPages.current = Math.ceil(productsFound / resultsByPage);

            /******************************************** Seteo de paginación ***********************************/

            if (quantityOfPages.current > 0 && pageNumberFromQuery > quantityOfPages.current) return (navigate("/home?page=1"));

            const pagesIndexArr = [];
            for (let i = 1; i <= quantityOfPages.current; i++) pagesIndexArr.push(i);                                         //Generamos array con todas las paginas
            
            let maxPageArrIndex = pageNumberFromQuery + 2;                                                                    //Lógica para calcular los números de páginas que se muestran   
            let minPageArrIndex = pageNumberFromQuery - 3;                                                                    //  en la barra de paginación
            if (pagesIndexArr.length <= 5) {
                minPageArrIndex = 0;
                maxPageArrIndex = pagesIndexArr.length;
            } else {
                if (maxPageArrIndex > pagesIndexArr.length) {
                    const excededMaxLegth = maxPageArrIndex - pagesIndexArr.length;
                    minPageArrIndex -= excededMaxLegth;
                } else if (minPageArrIndex < 0) {
                    const excededMinLegth = Math.abs(minPageArrIndex);
                    maxPageArrIndex += excededMinLegth;
                }
            }          
            if (maxPageArrIndex > pagesIndexArr.length) maxPageArrIndex = pagesIndexArr.length;
            if (minPageArrIndex < 0) minPageArrIndex = 0;

            const pagesIndexArrSegmented = pagesIndexArr.slice(minPageArrIndex, maxPageArrIndex);                           //Del array con todas las paginas obtenemos la actual, las 2 anteriores y las dos posteriores
            const pagesIndexJSX = pagesIndexArrSegmented.map((numberOfPage, index) => 
                <div 
                    onClick={() => navigate(`/home?page=${numberOfPage}&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${getPriceRange()}&orderBy=${orderBy}&brand=${brandId}`) } 
                    key={index} 
                    className="homeNumberOfPage homePaginationButton opcionHoverPinkTransition flex">
                    {numberOfPage}
                </div>
            );

            /****************************************************************************************************/
            
            const response2 = await getProductsFiltered({
                limit: resultsByPage, 
                offset: firstProduct , 
                // fields: ["nombre", "precio", "stock", "codigo", "foto1", "foto2", "id"],                                             //Si requerimos el campo "foto1" (ruta de imagen) el backend agrega el campo "thumbnail" (ruta de thumbnail) automaticamente
                fields: ["nombre", "precio", "codigo", "foto1", "foto2", "id"],                                             //Si requerimos el campo "foto1" (ruta de imagen) el backend agrega el campo "thumbnail" (ruta de thumbnail) automaticamente
                condition: {
                    field: "estado", 
                    operator: "=", 
                    value: "1"
                },
                searchWordsArr: searchWordsArrInOBJ,
                categoriesIdsArr: categoriesArrInOBJ,
                priceRangeArr: priceRangeArrOBJ.length ? (currencyIsUsd ? [priceRangeArrOBJ[0] * globalMultiplier, priceRangeArrOBJ[1] * globalMultiplier] : [priceRangeArrOBJ[0], priceRangeArrOBJ[1]]) : [],
                orderBy: orderBy || "default",
                brand: brandId || activeBrands[0].id,
            });          

            /************************** Obtenemos las categorías para listarlas en el filtro ******************************/
             
            const response3 = await getTable({tableName: "categoria"});                                                                                              
            if (response3.success) {
                const categoriesNamesArr = response3.data.map((categorie: any, index: number) =>                        //El id de la categoria corresponde al numero de categoria de los productos
                    <div className="filterInputCont flex" key={index}>
                        <div className="filterCheckBox">
                            <input type="checkbox" className="filterCheckBox_hidden filterCheckBoxOfCategorie" id={categorie.id} onClick={searchByCategorieAndPriceRange}/>     
                            <div className="filterCheckBox_shown flex"></div>                                                        
                        </div>
                        <p className="filterCategorieName">{categorie.nombre}</p>
                    </div>
                );
                setCategories(categoriesNamesArr);
            } else {
                setCategories([]);
            }

            /************************* Obtención de datos de Paños ***************************/
            
            const response4 = await getTable({tableName: "pano"});
            const response5 = await getTable({tableName: "panoxproducto"});

            if (response4.success && response5.success) {                                                   //Almacenamos tablas en variables de referencia
                const panoTable: Pano[] = response4.data;
                const panoXProductoTable: Panoxproducto[] = response5.data;
                panosTables.current = {
                    pano: panoTable,
                    panoxproducto: panoXProductoTable
                };
            } else {
                panosTables.current = {
                    pano: null,
                    panoxproducto: null
                };
            }

            /************************* Renderizado de cards ***************************/
                       
            if (response2.success && response2.data.length && response1.success && response1.data) {

                setProductsData(response2.data);
                setProductsFound(productsFound);
                setPagesIndex(pagesIndexJSX);
            } else if (response2.success && !response2.data.length) {
                setProductsFound(productsFound);
                setPagesIndex(pagesIndexJSX);
                setProducts([<p key={0} className="noResultsText">Sin resultados</p>]);
                setProductsData([]);
            } else {
                if (!response1.success) console.log(response1.message);
                if (!response2.success) console.log(response2.message);
                showElement(true);
                showSpinner(false);
            }

            /********************************************************* Seteo de los inputs de rango de precio y palabras de busqueda ***************************************************/

            if (searchWordsArrInOBJ.length) {
                setSearchWords(searchWordsArrInOBJ);
            } else {
                setSearchWords([]);
            }

            if (priceRangeArrOBJ.length) {
                setPriceRange([priceRangeArrOBJ[0], priceRangeArrOBJ[1]]);
            } else {
                setPriceRange(["", ""]);
            }
            
            /************************* Si hay opciones de filtro guardadas en el localstorage actualizamos el filtro cambiando la url ***************************/

            if (firstTime.current) {                                                        //Actualizamos el filtro solo la primera vez que se monta el componente
                firstTime.current = false;

                const querysData = localStorage.getItem("querysData");
                if (querysData) {
                    try {
                        const querysDataDataObj: QuerysData = JSON.parse(querysData);
                        const { searchWords: savedSearchWords, categories: savedCategories, priceRange: savedPriceRange, orderBy: savedOrderBy, brandId: savedBrandId, pageNumberFromQuery: savedPageNumber } = querysDataDataObj;
                        
                        // Actualizar el state local directamente en lugar de navegar
                        if (savedSearchWords && savedSearchWords.length > 0) {
                            setSearchWords(savedSearchWords);
                        }
                        
                        if (savedPriceRange && savedPriceRange.length === 2) {
                            setPriceRange([savedPriceRange[0], savedPriceRange[1]]);
                        }
                        
                        // Solo navegar si la página es diferente o si hay cambios significativos en los filtros
                        const currentFilters = {
                            searchWords: searchWordsArrInOBJ,
                            categories: categoriesArrInOBJ,
                            priceRange: priceRangeArrOBJ,
                            orderBy,
                            brandId
                        };
                        
                        const savedFilters = {
                            searchWords: savedSearchWords,
                            categories: savedCategories,
                            priceRange: savedPriceRange,
                            orderBy: savedOrderBy,
                            brandId: savedBrandId
                        };
                        
                        const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(savedFilters);
                        const pageChanged = savedPageNumber !== pageNumberFromQuery;
                        
                        if (filtersChanged || pageChanged) {
                            // Construir la nueva URL solo si es necesario
                            const newUrl = `/home?page=${savedPageNumber}&searchWords=${JSON.stringify(savedSearchWords)}&categories=${JSON.stringify(savedCategories)}&priceRange=${JSON.stringify(savedPriceRange)}&orderBy=${savedOrderBy}&brand=${savedBrandId}`;
                            
                            // Usar replace en lugar de navigate para evitar entradas en el historial
                            window.history.replaceState(null, "", newUrl);
                            
                            // Actualizar las variables de query para que se reflejen en el resto del componente
                            // Esto se hará automáticamente en el siguiente render
                        }
                    } catch (error) {
                        console.error("Error parsing querysData from localStorage:", error);
                        // Limpiar localStorage si hay datos corruptos
                        localStorage.removeItem("querysData");
                    }
                }
            }

        })();

        /****** Lógica para poner en negrita la opción del filtro de orden seleccionada o sino elegimos ninguna se selacciona la opción por defecto *****/

        const filterOrderOptions = document.querySelector(".filterOrderOptionsDropDownCont")?.childNodes as NodeListOf<HTMLParagraphElement>;
        const filterOrderOptionsArr = Array.from(filterOrderOptions);
        filterOrderOptionsArr.forEach((option) => option.classList.remove("filterOrderOptionsDropDowSelected"));
        if (orderBy) {
            const index = filterOrderOptionsArr.findIndex((option) => option.role === orderBy);
            filterOrderOptionsArr[index].classList.add("filterOrderOptionsDropDowSelected");
        } else {
            const orderByDefault: FilterOrderByTypes = "default";
            const index = filterOrderOptionsArr.findIndex((option) => option.role === orderByDefault);
            filterOrderOptionsArr[index].classList.add("filterOrderOptionsDropDowSelected");
        }
                                         
    }, [pageNumberFromQuery, searchWordsArrInJSON, categoriesArrInJSON, priceRangeArrJSON, orderBy, brandId]);

    /******* Lógica para seleccionar las opciones de categoría según query en url (Una vez que se hizo el map de categorías)*******/

    useEffect(() => {
        const filtersCheckBoxsOfCategorie = document.querySelectorAll(".filterCheckBoxOfCategorie") as NodeListOf<HTMLInputElement>;

        if(!categoriesArrInOBJ.length || !categories.length) {                                                  //Si no hay query de categoria resetamos todos los checkboxes
            if (filtersCheckBoxsOfCategorie && filtersCheckBoxsOfCategorie.length) {
                filtersCheckBoxsOfCategorie.forEach((checkBox) => checkBox.checked = false);
            }
            return;
        }

        const filtersCheckBoxOfCategorieArr = Array.from(filtersCheckBoxsOfCategorie);
        filtersCheckBoxOfCategorieArr.forEach((checkBox) => checkBox.checked = false);
        const categoriesSelected = filtersCheckBoxOfCategorieArr.filter((categorieHTML) => categoriesArrInOBJ.includes(categorieHTML.id));
        categoriesSelected.forEach((categorieHTML) => categorieHTML.checked = true);
    }, [categories]);

    const getCategories = () => {
        const categoriesInputs = document.querySelectorAll(".filterCheckBoxOfCategorie") as NodeListOf <HTMLInputElement>;
        const categoriesInputsArr = Array.from(categoriesInputs);
        const categoriesInputsChecked = categoriesInputsArr.filter((input) => input.checked);
        const categoriesIdsArr = categoriesInputsChecked.map((input) => input.id);
        const categoriesIdsArrInJSON = categoriesIdsArr.length ? JSON.stringify(categoriesIdsArr) : JSON.stringify([]);
        return categoriesIdsArrInJSON;
    };
    
    useEffect(() => {
        if (!productsData || !productsData.length) return;
        const mult = globalMultiplierRef.current || 0;
        const productsJSX = productsData.map((data: Producto, index: number) => {
            const ars = data.precio;
            const usd = data.precioDolar ?? (mult ? ars / mult : undefined);
            let priceARS = ars ?? ((data.precioDolar && mult) ? data.precioDolar * mult : undefined);
            if (priceARS !== undefined && priceARS < 1000 && usd !== undefined && mult > 50) {
                priceARS = usd * mult;
            }
            return (
                <ProductCard 
                    description={data.nombre}  
                    code={data.codigo} 
                    priceUSD={usd} 
                    priceARS={priceARS} 
                    key={index}
                    imgSrc1={data.thumbnail1}
                    imgSrc2={data.thumbnail2}
                    productID= {data.id}
                    onClickFunction={showProductDetails}
                    pano={getPano(data.id)}
                    dolar={currencyIsUsd}
                />
            );
        });
        setProducts(productsJSX);
    }, [productsData, currencyIsUsd]);
    
    useEffect(() => {
        
        // Mostrar inmediatamente todos los componentes que no son productos
        showElement(true);
        showSpinner(false);
        
        // Lógica para poner en gris el número de la página actual (no depende de imágenes)
        if (pagesIndex.length) {                                                                                                        
            const homePagesIndexContainer = document.querySelectorAll(".homePagesIndexContainer") as NodeListOf <HTMLDivElement>;
            if (homePagesIndexContainer.length) {
                const homePagesIndexContainerArr = Array.from(homePagesIndexContainer);

                homePagesIndexContainerArr.forEach((container) => {
                    const homeNumbersOfPage = container.querySelectorAll(".homeNumberOfPage") as NodeListOf <HTMLAnchorElement>;
                    if (homeNumbersOfPage.length) {
                        homeNumbersOfPage.forEach((numberOfPage) => numberOfPage.classList.remove("actualPageNumberGray"));
                        const homeNumbersOfPageArr = Array.from(homeNumbersOfPage);
                        const index = homeNumbersOfPageArr.findIndex((numberOfPage) => numberOfPage.textContent === pageNumberFromQuery.toString());
                        if (index !== -1) {
                            homeNumbersOfPageArr[index].classList.add("actualPageNumberGray");
                        }
                    }
                });
            }
        }

        // Restaurar posición de scroll inmediatamente si es necesario (no esperar a las imágenes)
        if (scrollPositionRef.current > 0) {
            restoreScrollPosition();
            scrollPositionRef.current = 0; // Reset para evitar restaurar múltiples veces
        }


                  
    }, [products, pagesIndex]);

    /******************************* Lógica para buscar propductos con texto  **************************/

    const getSearchWords = () => {                                                                                                         
        const serachInput = document.querySelector(".homePageFinderSearchInput") as HTMLInputElement; 
        const searchWordsArr = serachInput.value.split(" ");
        const searchWordsArrWithoutSpaces = searchWordsArr.map((word) => word.trim());
        const searchWordsArrWithoutEmptyStrings = searchWordsArrWithoutSpaces.filter((word) => word !== "");
        const searchWordsArrInJSON = searchWordsArrWithoutEmptyStrings.length ? JSON.stringify(searchWordsArrWithoutEmptyStrings) : JSON.stringify([]);
        return searchWordsArrInJSON;
    };

    const searchWordsQuery = () => {
        saveScrollPosition();
        saveInputsState();
        navigate(`/home?page=1&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${priceRangeArrJSON}&orderBy=${orderBy}&brand=${brandId}`);
    };

    const handleCurrencyToggle = (isUsdSelected: boolean) => {
        if (isUsdSelected === currencyIsUsd) return;
        dispatch(setDolar(isUsdSelected));
    };

    const calculateNextPage = () => {
        let nextPage = pageNumberFromQuery + 1;
        if (nextPage > quantityOfPages.current) nextPage = quantityOfPages.current;
        return nextPage;
    };

    const calculatePreviousPage = () => {
        let previousPage = pageNumberFromQuery - 1;
        if (previousPage < 1) previousPage = 1;
        return previousPage;
    };  

    /*************************** Sanitización de valores de rango de precio **************************/

    const checkIfRange = () => {
        const filterPriceInputMin = document.querySelector(".filterPriceInputMin") as HTMLInputElement;
        const filterPriceInputMax = document.querySelector(".filterPriceInputMax") as HTMLInputElement;
        const filterPriceMinValue = parseFloat(filterPriceInputMin.value.trim());                                             //Si los valores contienen caracteres el parseInt da NaN que es equivalente a false
        const filterPriceMaxValue = parseFloat(filterPriceInputMax.value.trim());
        
        if (
            (isNaN(filterPriceMinValue) && filterPriceInputMin.value !== "")                                                //El string vacio se toma como un cero por eso se excluye del if que retorna falso                                         
            || filterPriceMinValue < 0 
            || !filterPriceMaxValue 
            || filterPriceMaxValue < 0
            || filterPriceInputMax < (filterPriceInputMin || 0)
        ) {
            return false;
        } else {
            return ([(filterPriceMinValue || 0), filterPriceMaxValue]);                                                     //Si el valor mínimo no se introduce equivale a poner cero
        }
    };

    const getPriceRange = () => {
        return JSON.stringify(checkIfRange() || []);
    };
    
    const searchByCategorieAndPriceRange = () => {
        const rangeArrOBJ = checkIfRange() || [];
        const rangeArrJSON = JSON.stringify(rangeArrOBJ);
        const categoriesInputs = document.querySelectorAll(".filterCheckBox_hidden") as NodeListOf <HTMLInputElement>;
        const categoriesInputsArr = Array.from(categoriesInputs);
        const categoriesInputsChecked = categoriesInputsArr.filter((input) => input.checked);
        const categoriesIdsArr = categoriesInputsChecked.map((input) => input.id);
        const categoriesIdsArrInJSON = categoriesIdsArr.length ? JSON.stringify(categoriesIdsArr) : JSON.stringify([]);
        
        saveScrollPosition();
        saveInputsState();
        navigate(`/home?page=1&searchWords=${getSearchWords()}&categories=${categoriesIdsArrInJSON}&priceRange=${rangeArrJSON}&orderBy=${orderBy}&brand=${brandId}`);
    };

    const clearPriceRangeInputs = () => {
        const filterPriceInputMin = document.querySelector(".filterPriceInputMin") as HTMLInputElement;
        const filterPriceInputMax = document.querySelector(".filterPriceInputMax") as HTMLInputElement;
        filterPriceInputMin.value = "";
        filterPriceInputMax.value = "";
    };

    /**************************** Apertura y cierre de la ventana de orden de productos  *******************************/

    const closeDropDown = () => {
        const filterOrderOptionsDropDownCont = document.querySelector(".filterOrderOptionsDropDownCont") as HTMLDivElement;
        if (!filterOrderOptionsDropDownCont) return;
        filterOrderOptionsDropDownCont.classList.add("displayNone");
        document.body.removeEventListener("click", closeDropDown);
    };

    const handleShowDropDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        const filterOrderOptionsDropDownCont = document.querySelector(".filterOrderOptionsDropDownCont") as HTMLDivElement;
        if (filterOrderOptionsDropDownCont.getAttribute("class")?.includes("displayNone")) {
            filterOrderOptionsDropDownCont.classList.remove("displayNone");
            document.body.addEventListener("click", closeDropDown);
        } else {
            filterOrderOptionsDropDownCont.classList.add("displayNone");
        }
    };  

    /****************** Apertura y cierre de la ventana de tipo de productos y rango de precio ***********************/

    const handleShowFilters = () => {
        const filtersShownCont = document.querySelector(".filtersShownCont") as HTMLDivElement;
        if (filtersShownCont.style.maxHeight === "0px" || !filtersShownCont.style.maxHeight) {
            filtersShownCont.style.maxHeight = filtersShownCont.scrollHeight + "px";
            filtersStatus.current.filtersOpen = true;
        } else {
            filtersShownCont.style.maxHeight = "0px";
            filtersStatus.current.filtersOpen = false;
        }
        localStorage.setItem("filtersStatus", JSON.stringify(filtersStatus.current));
                
        const homePageFilterOptionTextOpen = document.querySelector(".homePageFilterOptionText[role='open']");
        if (homePageFilterOptionTextOpen) homePageFilterOptionTextOpen.classList.toggle("displayNone");
        
        const homePageFilterOptionTextClose = document.querySelector(".homePageFilterOptionText[role='close']");
        if (homePageFilterOptionTextClose) homePageFilterOptionTextClose.classList.toggle("displayNone");
    };

    const resetFilters = () => {
        localStorage.setItem("querysData", "");
        localStorage.removeItem("homeScrollPosition");
        localStorage.removeItem("homeInputsState");
        clearPriceRangeInputs();
        navigate("/home");
    };

    const adjustFilters = () => {                                                                           //Logica para que no se oculten parte de los filtros si hacemos un resize
        const filtersShownCont = document.querySelector(".filtersShownCont") as HTMLDivElement;             // y tenemos un max-height seteado
        if (filtersShownCont.style.maxHeight !== "0px" && filtersShownCont.style.maxHeight) {               //Si el dropdown está abierto....
            filtersShownCont.style.maxHeight = filtersShownCont.scrollHeight + "px";                        // y hacemos resize o cambio de orientacion ajustamos el max-height nuevamente
        }
    };
    
    useEffect(() => {
        window.addEventListener("orientationchange", adjustFilters);
        window.addEventListener("resize", adjustFilters);

        return () => {
            window.removeEventListener("orientationchange", adjustFilters);
            window.removeEventListener("resize", adjustFilters);
        };
    }, []);

    const orderResultsBy = (orderByFromOptions: FilterOrderByTypes) => {
        saveScrollPosition();
        saveInputsState();
        navigate(`/home?page=1&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${priceRangeArrJSON}&orderBy=${orderByFromOptions}&brand=${brandId}`);
    };

    const closeBrandsDropDown = () => {
        const brandsDropdown = document.querySelector(".homeBrandDropdownCont") as HTMLDivElement;
        if (!brandsDropdown) return;
        brandsDropdown.classList.add("displayNone");
        document.body.removeEventListener("click", closeBrandsDropDown);
    };

    const handleBrandsSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        const brandsDropdown = document.querySelector(".homeBrandDropdownCont") as HTMLDivElement;
        if (!brandsDropdown) return;
        if (brandsDropdown.getAttribute("class")?.includes("displayNone")) {
            brandsDropdown.classList.remove("displayNone");
            document.body.addEventListener("click", closeBrandsDropDown);
        } else {
            brandsDropdown.classList.add("displayNone");
        }
    };

    /************************************** Lógica de busqueda dinámica de productos **************************************/

    const closeSearchWordsResults = () => {
        setSearchWordsResults([]);
        document.removeEventListener("click", closeSearchWordsResults);
    };

    const handleSearchWords = async (e: React.ChangeEvent) => {

        const serachInput = e.target as HTMLInputElement;
        const searchWordsArr = serachInput.value.split(" ");
        const searchWordsArrWithoutSpaces = searchWordsArr.map((word) => word.trim());
        const searchWordsArrWithoutEmptyStrings = searchWordsArrWithoutSpaces.filter((word) => word !== "");

        setSearchWords(searchWordsArr);

        if (!searchWordsArrWithoutEmptyStrings.length) {
            setSearchWordsResults([]);
            return;
        }
   
        const response2 = await getProductsFiltered({
            limit: 10, 
            offset: 0, 
            fields: ["nombre", "id", "codigo"],                                              
            condition: {
                field: "estado", 
                operator: "=", 
                value: "1"
            },
            searchWordsArr: searchWordsArrWithoutEmptyStrings,
            categoriesIdsArr: categoriesArrInOBJ,
            priceRangeArr: priceRangeArrOBJ.length ? (currencyIsUsd ? [priceRangeArrOBJ[0] * globalMultiplierRef.current, priceRangeArrOBJ[1] * globalMultiplierRef.current] : [priceRangeArrOBJ[0], priceRangeArrOBJ[1]]) : [],
            orderBy: orderBy || "default",
            brand: brandId || activeBrandsRef.current[0].id
        });          

        if (response2.data && response2.data.length) {
            const productsData: Producto[] = response2.data;
            setSearchWordsResults(productsData.map((product) => {
                return (
                    <div className="searchWordsResult flex" key={product.id} onClick={() => showProductDetails(product.id)}>
                        <p className="searchWordsResultText">{product.nombre.length > 80 ? product.nombre.substring(0, 80) + "..." : product.nombre } <span>({product.codigo})</span></p>
                    </div>
                );
            }));
        } else {
            setSearchWordsResults([]);
        }

        document.addEventListener("click", closeSearchWordsResults);
    };

    const waitForEnter = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") searchWordsQuery();
    };



    return (
        <div className="pagesContainer homeContainer flex wrap elementToShow">

            <div className="homePageBrandSelectCont flex">
                <img src={bgBrandImageSrc} alt="" className="homePageBrandSelectImg"/>

                <div className="homeBrandsSelectMainCont flex">
                    <div className="homeBrandsSelectCont flex column">
                        <p className="homeBrandsSelectTitle">Elije una marca:</p>
                        <div className="homeBrandsSelect flex" onClick={handleBrandsSelect}>                        {/* Selector de Marcas */}                                  
                            <div className="homeBrandDropdownCont displayNone dropDownAnimation1_in flex column">
                                {brands}
                            </div>
                            <img src={currentBrandImageSrc} alt="Marca actual" className="currencyBrandImg"/>
                            <p className="homeBrandSelectSymbol flex">V</p>
                        </div>
                    </div>
                </div>

            </div>

            <div className="homePageFiltersCont flex">                                                         {/* Ventana principal de filtros */}   
                <div  className="homePageFiltersInternalCont flex wrap">
                    <div className="homePageFinderMainCont flex">
                        <div className="homePageFinderCont flex">
                            <input
                                type="text"
                                placeholder="Buscar Pieza :"
                                className="homePageFinderSearchInput"
                                value={searchWords.length ? searchWords.join(" ") : ""}
                                onChange={handleSearchWords}
                                onKeyDown={waitForEnter}
                            />
                            <img src="/images/icons/search.png" alt="Buscar" className="homePageFinderSearchIcon iconHoverGrayToPinkTransition" onClick={searchWordsQuery} />
                            <div className="searchWordsResultsCont flex column">
                                {searchWordsResults}
                            </div>
                        </div>
                    </div>
                    <div className="homePageFilterCont flex">
                        <div className="homePageFilterOptionCont homePageFilterOptionContToGreenTransition flex" onClick={handleShowFilters}>
                            <img src="/images/icons/filter.png" alt="Filtros" className="homePageFilterOptionIcon" />
                            <p className="homePageFilterOptionText" role="open">Ver Filtros</p>
                            <p className="homePageFilterOptionText displayNone" role="close">Cerrar Filtros</p>
                        </div>
                        <div className="homePageFilterOptionCont homePageFilterOptionContToGreenTransition flex" onClick={resetFilters}>
                            <img src="/images/icons/filter.png" alt="Filtros" className="homePageFilterOptionIcon" />
                            <p className="homePageFilterOptionText">Resetear</p>
                        </div>
                    </div>
                    <div className="homePageOrderCont flex">
                        <div className="homePageFilterOptionCont homePageOrderOptionCont flex" onClick={handleShowDropDown}>
                            <p className="homePageFilterOptionText homePageOrderOptionText">Ordenar</p>
                            <img src="/images/icons/order.png" alt="Filtros" className="homePageFilterOptionIcon homePageOrderOptionIcon" />

                            <div className="filterOrderOptionsDropDownCont displayNone dropDownAnimation1_in flex column">
                                <p className="filterOrderOptionsDropDowSelected" onClick={() => orderResultsBy("default")} role="default">Por defecto</p>
                                <p onClick={() => orderResultsBy("alphabetic")} role="alphabetic">Alfabéticamente</p>
                                <p onClick={() => orderResultsBy("price_asc")} role="price_asc">Menor Precio a Mayor Precio</p>
                                <p onClick={() => orderResultsBy("price_desc")} role="price_desc">Mayor Precio a Menor Precio</p>
                                <p onClick={() => orderResultsBy("date")} role="date">Fecha de Subida</p>
                            </div>
                        </div>
                        <p className="homePageOrderTextFindedQuantity">Se encontraron <span className="homePageOrderTextFindedQuantityBold">{productsFound} Productos</span> en <span className="homePageOrderTextFindedQuantityBold">Joyas1945</span></p>
                    </div>
                </div>
            </div>

            <div className="filtersShownCont">                                                                 {/* Ventana de tipo de productos y filtrado por rango de precios */}
                <div className="filtersShownIntCont">
                    <div className="filtersShownInt2Cont flex wrap">
                        <div className="filtersCurrencyToggleCont filtersShownInternalCont flex">
                            <span className="visuallyHidden" aria-hidden="true">Moneda</span>
                            <div className="homePageCurrencyToggleCont flex" role="group" aria-label="Seleccionar moneda">
                                <button
                                    className={`currencyToggleOption ${currencyIsUsd ? "active" : ""}`}
                                    aria-pressed={currencyIsUsd}
                                    onClick={() => handleCurrencyToggle(true)}
                                >
                                    USD
                                </button>
                                <button
                                    className={`currencyToggleOption ${!currencyIsUsd ? "active" : ""}`}
                                    aria-pressed={!currencyIsUsd}
                                    onClick={() => handleCurrencyToggle(false)}
                                >
                                    ARS
                                </button>
                            </div>
                        </div>
                        <div className="filtersShownTypesCont filtersShownInternalCont flex">
                            <p className="filtersShownTitle">Tipo</p>
                            <div className="filtersShownTypes flex">
                                {categories}
                            </div>
                        </div>
                        <div className="filtersPriceRangeCont filtersShownInternalCont flex">
                            <p className="filterPriceRangeTitle">RANGO DE<br />PRECIO</p>
                            <div className="filterPriceInputsCont flex">
                                <input type="number" className="filterPriceInput filterPriceInputMin" defaultValue={priceRange && priceRange.length ? priceRange[0] : ""} />
                                -
                                <input type="number" className="filterPriceInput filterPriceInputMax" defaultValue={priceRange && priceRange.length ? priceRange[1] : ""} />
                            </div>
                            <button className="filterButton" onClick={searchByCategorieAndPriceRange}>
                                Filtrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {                                                                                                          /* Productos y paginación */  
                productsFound !== 0 &&
                <div className="homePagesIndexContainer flex">
                    <div 
                        className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                        onClick={ () => navigate(`/home?page=${calculatePreviousPage()}&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${getPriceRange()}&orderBy=${orderBy}&brand=${brandId}`) } 
                    >
                        ‹ 
                    </div>
                    {pagesIndex}
                    <div 
                        className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                        onClick={ () => navigate(`/home?page=${calculateNextPage()}&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${getPriceRange()}&orderBy=${orderBy}&brand=${brandId}`) } 
                    > 
                        › 
                    </div>
                </div>
            }
            <div className="homeProductsContainer flex wrap">
                {products}
            </div>
            {
                productsFound !== 0 &&
                <div className="homePagesIndexContainer flex">
                    <div 
                        className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                        onClick={ () => navigate(`/home?page=${calculatePreviousPage()}&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${getPriceRange()}&orderBy=${orderBy}&brand=${brandId}`)  } 
                    > 
                        ‹ 
                    </div>
                    {pagesIndex}
                    <div 
                        className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                        onClick={ () => navigate(`/home?page=${calculateNextPage()}&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${getPriceRange()}&orderBy=${orderBy}&brand=${brandId}`) } 
                    > 
                        › 
                    </div>
                </div>
            }
            
            <ProductDetailModal 
                productID={modalProductID}
                isOpen={isModalOpen}
                onClose={closeModal}
            />
        </div>
    );
}

export default Home; 
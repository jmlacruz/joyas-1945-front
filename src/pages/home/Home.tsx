import { useContext, useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import ProductCard from "../../components/cards/product/Product";
import ProductDetailModal from "../../components/productDetailModal/ProductDetailModal";
import { useBrands } from "../../context/brandsContext";
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
    const navigate = useNavigate();
    const location = useLocation();
    const quantityOfPages = useRef(0);
    const [brands, setBrands] = useState <JSX.Element[]> ([]);
    const [bgBrandImageSrc, setBgBrandImageSrc] = useState("");
    const {showSpinner} = useContext(SpinnerContext);
    const [currentBrandImageSrc, setCurrentBrandImageSrc] = useState ("");
    const [products, setProducts] = useState <JSX.Element[] | null> (null);
    const [productsData, setProductsData] = useState<Producto[] | null>(null);
    const [categoriesData, setCategoriesData] = useState<Array<{id: number, nombre: string}>>([]);
    const [productsFound, setProductsFound] = useState <number> (0);
    const [pagesIndex, setPagesIndex] = useState <JSX.Element[]> ([]); 
    const query = useQuery();                                                                                        //Hook para leer querys de url
    const pageString = query.get("page");
    const searchWordsStr = query.get("searchWords") as string;
    const categoriesArrStr = query.get("categories") as string;
    const priceRangeArrStr = query.get("priceRange") as string;
    const orderBy = query.get("orderBy") as FilterOrderByTypes | "" || "";
    const brandIdFromQuery = query.get("brand");
    const resultsByPage = 60;                   //<------- Si se cambia este valor también hay que cambiarlo en el dashboard en "ProductsOrder.page.tsx"
    const skeletonCount = Math.min(resultsByPage, 12);
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

  



    const renderSkeletons = () => Array.from({length: skeletonCount}, (_, index) => (
        <div className="productCardCont productCardSkeleton" key={`skeleton-${index}`}>
            <Skeleton height="100%" width="100%" />
        </div>
    ));
     
    // Helper function to normalize brandId from query params
    const getBrandIdFromQuery = (brandIdParam: string | null, defaultBrandId: string): string => {
        // Handle null, empty string, or whitespace-only strings
        if (!brandIdParam || brandIdParam.trim() === "") {
            return defaultBrandId;
        }
        return brandIdParam.trim();
    };

    // Helper function to get current brandId for navigate calls
    const getCurrentBrandId = (): string => {
        return brandIdRef.current || brandIdFromQuery || "";
    };

    // Parse categories from URL for syncing with selectedCategories state
    const categoriesArrParsed = isValidJSON(categoriesArrStr) ? JSON.parse(categoriesArrStr) : [];
    const categoriesArrInOBJ: number[] = Array.isArray(categoriesArrParsed) 
        ? categoriesArrParsed
            .map((cat: any) => {
                const num = typeof cat === "string" ? parseInt(cat, 10) : typeof cat === "number" ? cat : null;
                return !isNaN(num as number) ? num : null;
            })
            .filter((cat: any): cat is number => cat !== null)
        : [];
    // Centralized filter state - initialized from URL params
    const [filterState, setFilterState] = useState<{
        searchWords: string[];
        categories: number[];
        priceRange: [number, number] | null;
        orderBy: FilterOrderByTypes;
    }>(() => {
        // Initialize from URL params
        const searchWordsFromURL: string[] = isValidJSON(searchWordsStr) ? JSON.parse(searchWordsStr) : [];
        const categoriesFromURL: number[] = isValidJSON(categoriesArrStr) 
            ? JSON.parse(categoriesArrStr)
                .map((cat: any) => {
                    const num = typeof cat === "string" ? parseInt(cat, 10) : typeof cat === "number" ? cat : null;
                    return !isNaN(num as number) ? num : null;
                })
                .filter((cat: any): cat is number => cat !== null)
            : [];
        const priceRangeFromURL: [number, number] | null = isValidJSON(priceRangeArrStr) && Array.isArray(JSON.parse(priceRangeArrStr)) && JSON.parse(priceRangeArrStr).length === 2
            ? (() => {
                const parsed = JSON.parse(priceRangeArrStr);
                const min = typeof parsed[0] === "string" ? parseFloat(parsed[0]) : parsed[0];
                const max = typeof parsed[1] === "string" ? parseFloat(parsed[1]) : parsed[1];
                if (!isNaN(min) && !isNaN(max) && min >= 0 && max >= 0) {
                    return [min, max] as [number, number];
                }
                return null;
            })()
            : null;
        
        return {
            searchWords: searchWordsFromURL,
            categories: categoriesFromURL,
            priceRange: priceRangeFromURL,
            orderBy: (orderBy || "default") as FilterOrderByTypes
        };
    });
    
    // Refs for price inputs (controlled via refs to avoid breaking existing DOM structure)
    const priceMinRef = useRef<HTMLInputElement>(null);
    const priceMaxRef = useRef<HTMLInputElement>(null);
    
    // State for categories checkboxes
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    
    // Legacy state for backward compatibility (synced with filterState for UI display)
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
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const brandIdRef = useRef<string>("");
    const [brandIdInitialized, setBrandIdInitialized] = useState(false);
    const [activeBrandsState, setActiveBrandsState] = useState<Marca[]>([]);

    const { streamChat } = useContext(StreamChatContext);
    const { email, city, name, lastName, dolar } = useSelector((state: RootState) => state.user.value);
    const dispatch = useDispatch();
    const currencyIsUsd = dolar ?? true;
    
    // Brands context for sharing with NavBar
    const { setBrands: setBrandsContext, setActiveBrandId, setOnBrandSelect } = useBrands();
        
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

    // Handler for brand selection from BrandTabs (used by NavBar via context)
    const handleBrandTabSelect = (brandId: string) => {
        const selectedBrand = activeBrandsState.find((brand) => brand.id.toString() === brandId);
        if (selectedBrand) {
            // Update the dropdown image
            const currencyBrandImg = document.querySelector(".currencyBrandImg") as HTMLImageElement;
            if (currencyBrandImg) {
                currencyBrandImg.src = selectedBrand.logo;
            }
            // Update background image
            setBgBrandImageSrc(selectedBrand.imagen);
            setCurrentBrandImageSrc(selectedBrand.logo);
        }
        // Reset filters when changing brand
        setFilterState({
            searchWords: [],
            categories: [],
            priceRange: null,
            orderBy: "default"
        });
        setSelectedCategories([]);
        navigate(`/home?page=1&brand=${brandId}`);
    };

    // Sync brands data and handler with context for NavBar
    useEffect(() => {
        if (activeBrandsState.length > 0) {
            setBrandsContext(activeBrandsState);
        }
    }, [activeBrandsState, setBrandsContext]);

    useEffect(() => {
        setOnBrandSelect(handleBrandTabSelect);
    }, [activeBrandsState, setOnBrandSelect]);

    useEffect(() => {
        if (brandIdRef.current) {
            setActiveBrandId(brandIdRef.current);
        }
    }, [brandIdRef.current, setActiveBrandId]);
    
    /************************* Centralized function to fetch products with filters ***************************/
    
    const fetchProductsWithFilters = async (
        filters: {
            searchWords: string[];
            categories: number[];
            priceRange: [number, number] | null;
            orderBy: FilterOrderByTypes;
        },
        page: number,
        brandId: string
    ) => {
        setIsFilterLoading(true);
        
        // Clear products display but keep productsFound until new data arrives
        // This prevents the counter from showing 0 during loading
        setProducts([]);
        setPagesIndex([]);
        
        try {
            const firstProduct = (page - 1) * resultsByPage;
            const globalMultiplier = globalMultiplierRef.current;
            
            // Calculate price range with multiplier if needed
            const priceRangeForQuery = filters.priceRange && filters.priceRange.length === 2
                ? (dolar 
                    ? [filters.priceRange[0] * globalMultiplier, filters.priceRange[1] * globalMultiplier]
                    : [filters.priceRange[0], filters.priceRange[1]])
                : [];
            
            // Get products count
            const response1 = await getProductsFilteredRowsQuantity({
                condition: {
                    field: "estado",
                    operator: "=",
                    value: "1"
                },
                searchWordsArr: filters.searchWords,
                categoriesIdsArr: filters.categories,
                priceRangeArr: priceRangeForQuery,
                brand: brandId,
            });
            
            if (!response1.success || response1.data === null || response1.data === undefined) {
                setProductsData([]);
                setProductsFound(0);
                setPagesIndex([]);
                setProducts([<p key={0} className="noResultsText">Error al cargar productos</p>]);
                showElement(true);
                showSpinner(false);
                setIsFilterLoading(false);
                return;
            }
            
            const productsFound = typeof response1.data === "number" ? response1.data : 0;
            quantityOfPages.current = Math.ceil(productsFound / resultsByPage);
            
            // Validate pages
            if (isNaN(quantityOfPages.current) || quantityOfPages.current < 0) {
                quantityOfPages.current = 0;
            }
            
            if (quantityOfPages.current > 0 && page > quantityOfPages.current) {
                showSpinner(false);
                setIsFilterLoading(false);
                // Reset to page 1 if current page is invalid
                navigate(`/home?page=1&brand=${brandId}`);
                return;
            }
            
            // Calculate pagination
            const pagesIndexArr = [];
            for (let i = 1; i <= quantityOfPages.current; i++) pagesIndexArr.push(i);
            
            let maxPageArrIndex = page + 2;
            let minPageArrIndex = page - 3;
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
            
            const pagesIndexArrSegmented = pagesIndexArr.slice(minPageArrIndex, maxPageArrIndex);
            const pagesIndexJSX = pagesIndexArrSegmented.map((numberOfPage, index) => 
                <div
                    onClick={() => {
                        navigate(`/home?page=${numberOfPage}&brand=${brandId}`);
                    }}
                    key={index}
                    className="homeNumberOfPage homePaginationButton opcionHoverPinkTransition flex">
                    {numberOfPage}
                </div>
            );
            
            // Get products
            const response2 = await getProductsFiltered({
                limit: resultsByPage,
                offset: firstProduct,
                fields: ["nombre", "precio", "codigo", "foto1", "foto2", "id", "con_descuento", "porcentaje_descuento", "precio_full"],
                condition: {
                    field: "estado",
                    operator: "=",
                    value: "1"
                },
                searchWordsArr: filters.searchWords,
                categoriesIdsArr: filters.categories,
                priceRangeArr: priceRangeForQuery,
                orderBy: filters.orderBy || "default",
                brand: brandId,
            });
            
            // Render products
            // Validar que response2.data existe y es un array antes de acceder a .length
            const isValidDataArray = Array.isArray(response2.data) && response2.data.length > 0;
            const hasValidCount = response1.success && typeof response1.data === "number";
            
            if (response2.success && isValidDataArray && hasValidCount) {
                // Store raw product data so products can be regenerated when currency changes
                setProductsData(response2.data);
                setProductsFound(productsFound);
                setPagesIndex(pagesIndexJSX);
                showSpinner(false);
                setIsFilterLoading(false);
            } else if (response2.success && Array.isArray(response2.data) && response2.data.length === 0) {
                // Sin resultados pero respuesta exitosa
                setProductsData([]);
                setProductsFound(productsFound);
                setPagesIndex(pagesIndexJSX);
                setProducts([<p key={0} className="noResultsText">Sin resultados</p>]);
                showSpinner(false);
                setIsFilterLoading(false);
            } else {
                // Manejo de errores
                setProductsData([]);
                setProductsFound(0);
                setPagesIndex([]);
                setProducts([<p key={0} className="noResultsText">Error al cargar productos</p>]);
                if (!response1.success) {
                    console.log("Error en response1 (getProductsFilteredRowsQuantity):", response1.message);
                }
                if (!response2.success) {
                    console.log("Error en response2 (getProductsFiltered):", response2.message);
                }
                if (response2.success && !Array.isArray(response2.data)) {
                    console.log("Error: response2.data no es un array. Tipo:", typeof response2.data, "Valor:", response2.data);
                }
                if (response2.success && Array.isArray(response2.data) && response2.data.length > 0 && !hasValidCount) {
                    console.log("Error: response1.data no es válido. Tipo:", typeof response1.data, "Valor:", response1.data);
                }
                showElement(true);
                showSpinner(false);
                setIsFilterLoading(false);
            }
        } catch (error) {
            setProductsData([]);
            setProductsFound(0);
            setPagesIndex([]);
            setProducts([<p key={0} className="noResultsText">Error al cargar productos</p>]);
            showElement(true);
            showSpinner(false);
            setIsFilterLoading(false);
        }
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
    
    // Initialize selectedCategories from filterState
    useEffect(() => {
        if (filterState.categories.length > 0 && selectedCategories.length === 0) {
            setSelectedCategories(filterState.categories);
        }
    }, [filterState.categories]);
    
    /********************************************** Abrimos los filtros si se dejaron abiertos *******************************************/

    useEffect(() => {                                                                                               //Si abrimos el filtro esperamos a que se renderizen las categorias para que el filtro tenga su scrollHeightFinal
        if (!firstTimeShownFilters.current || !categoriesData.length) return;
        firstTimeShownFilters.current = false;        
        const filterStatusJSON = localStorage.getItem("filtersStatus");
        if (!filterStatusJSON) return;
        const filterStatusOBJ: FiltersStatus = JSON.parse(filterStatusJSON);
        if (filterStatusOBJ.filtersOpen) {
            handleShowFilters();
        }
    }, [categoriesData]);
        
    /************************************** Almacenamiento de opciones de filtro en el localstorage **************************************/

    useEffect(() => {
        (async () => {
            if (
                !filterState.searchWords.length
                &&
                !filterState.categories.length
                &&
                !filterState.priceRange
                &&
                filterState.orderBy === "default"
                &&
                !brandIdRef.current
                &&
                (!pageNumberFromQuery || pageNumberFromQuery === 1)
            ) return;

            const querysData: QuerysData = {
                searchWords: filterState.searchWords,
                categories: filterState.categories.map(cat => cat.toString()),
                priceRange: filterState.priceRange || [],
                orderBy: filterState.orderBy,
                brandId: brandIdRef.current,
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
    }, [filterState, pageNumberFromQuery, brandIdRef.current]);
     
    /*************************************************************************************************************************************/
    
    // Initialization useEffect - runs once to load brands, categories, panos, multiplier
    useEffect(() => {
        setBrandIdInitialized(false); // Reset initialization state
        (async () => {
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
                // Reset filters when changing brand
                setFilterState({
                    searchWords: [],
                    categories: [],
                    priceRange: null,
                    orderBy: "default"
                });
                setSelectedCategories([]);
                saveScrollPosition();
                saveInputsState();
                navigate(`/home?page=1&brand=${brandId}`);
            };

            const response0 = await getTable({tableName: "marca"});
            if (!response0.success) {
                showElement(true);
                showSpinner(false);
                setIsFilterLoading(false);
                return;
            }
            const activeBrands: Marca[] = response0.data.filter((brand: any) => brand.estado === "1");
            activeBrands.sort((a: any, b: any) => a.orden - b.orden);
            activeBrandsRef.current = activeBrands;
            setActiveBrandsState(activeBrands);
            
            // Normalize brandId using helper function with default to brand id=135, or first brand as fallback
            const brand135 = activeBrands.find((brand: Marca) => brand.id === 135);
            const defaultBrandId = brand135 
                ? brand135.id.toString() 
                : (activeBrands.length > 0 ? activeBrands[0].id.toString() : "");
            const brandId = getBrandIdFromQuery(brandIdFromQuery, defaultBrandId);
            brandIdRef.current = brandId;
            setBrandIdInitialized(true);
            
            const brandSelected = activeBrands.find((brand: any) => brand.id.toString() === brandId);
            if (brandSelected) {
                setCurrentBrandImageSrc(brandSelected.logo);
                setBgBrandImageSrc(brandSelected.imagen);
            } else {
                setCurrentBrandImageSrc(activeBrands[0].logo);
                setBgBrandImageSrc(activeBrands[0].imagen);
            }
                                                                                                                            
            const brandsJSX = activeBrands.map((brand: any, index: number) => 
                <img src={brand.logo} alt={brand.descripcion} id={brand.id} className="brandLogoImg" key={index} onClick={handleSelectBrand}/>
            );                                      
            brandsJSX.length ? setBrands(brandsJSX) : setBrands([]);

            /************************** Obtenemos las categorías para listarlas en el filtro ******************************/
             
            const response3 = await getTable({tableName: "categoria"});                                                                                              
            if (response3.success) {
                const categoriesArr = response3.data.map((categorie: any) => ({
                    id: parseInt(categorie.id, 10),
                    nombre: categorie.nombre
                }));
                setCategoriesData(categoriesArr);
            } else {
                setCategoriesData([]);
            }

            /************************* Obtención de datos de Paños ***************************/
            
            const response4 = await getTable({tableName: "pano"});
            const response5 = await getTable({tableName: "panoxproducto"});

            if (response4.success && response5.success) {
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
        })();
    }, [brandIdFromQuery]);
    
    // Execute filter when navigating to /home route or when URL params change (including page refresh)
    useEffect(() => {
        if (location.pathname === "/home" && brandIdRef.current && brandIdInitialized) {
            (async () => {
                await fetchProductsWithFilters(
                    {
                        searchWords: filterState.searchWords,
                        categories: selectedCategories.length > 0 ? selectedCategories : filterState.categories,
                        priceRange: filterState.priceRange,
                        orderBy: filterState.orderBy
                    },
                    pageNumberFromQuery,
                    brandIdRef.current
                );
            })();
        }
    }, [location.pathname, location.search, brandIdInitialized, filterState, selectedCategories, pageNumberFromQuery]);
    
    // Main useEffect for fetching products - uses filterState
    useEffect(() => {
        if (firstRenderForSpinner.current) {
            showSpinner(true);
            firstRenderForSpinner.current = false;
        }

        if (!brandIdRef.current) return; // Wait for brand to be initialized
        
        (async () => {
            // Sync selectedCategories with filterState before fetching
            if (filterState.categories.length > 0 && selectedCategories.length === 0) {
                setSelectedCategories(filterState.categories);
            }
            
            // Use the centralized fetch function
            await fetchProductsWithFilters(
                {
                    searchWords: filterState.searchWords,
                    categories: selectedCategories.length > 0 ? selectedCategories : filterState.categories,
                    priceRange: filterState.priceRange,
                    orderBy: filterState.orderBy
                },
                pageNumberFromQuery,
                brandIdRef.current
            );
            
            // Sync legacy state for backward compatibility (for UI display)
            if (filterState.searchWords.length) {
                setSearchWords(filterState.searchWords);
            } else {
                setSearchWords([]);
            }
            
            // Handle localStorage restoration on first load
            if (firstTime.current) {
                firstTime.current = false;

                const querysData = localStorage.getItem("querysData");
                if (querysData) {
                    try {
                        const querysDataDataObj: QuerysData = JSON.parse(querysData);
                        const { searchWords: savedSearchWords, categories: savedCategories, priceRange: savedPriceRange, orderBy: savedOrderBy, brandId: savedBrandId, pageNumberFromQuery: savedPageNumber } = querysDataDataObj;
                        
                        if (savedSearchWords && savedSearchWords.length > 0) {
                            setFilterState(prev => ({
                                ...prev,
                                searchWords: savedSearchWords
                            }));
                        }
                        
                        if (savedPriceRange && savedPriceRange.length === 2) {
                            setFilterState(prev => ({
                                ...prev,
                                priceRange: [savedPriceRange[0], savedPriceRange[1]]
                            }));
                        }
                        
                        if (savedCategories && savedCategories.length > 0) {
                            const categoriesAsNumbers = savedCategories.map(cat => parseInt(cat, 10)).filter(cat => !isNaN(cat));
                            setFilterState(prev => ({
                                ...prev,
                                categories: categoriesAsNumbers
                            }));
                            setSelectedCategories(categoriesAsNumbers);
                        }
                        
                        if (savedOrderBy) {
                            setFilterState(prev => ({
                                ...prev,
                                orderBy: savedOrderBy as FilterOrderByTypes
                            }));
                        }
                        
                        if (savedPageNumber !== pageNumberFromQuery) {
                            navigate(`/home?page=${savedPageNumber}&brand=${savedBrandId || brandIdRef.current}`);
                        }
                    } catch (error) {
                        console.error("Error parsing querysData from localStorage:", error);
                        localStorage.removeItem("querysData");
                    }
                }
            }

        })();

        /****** Lógica para poner en negrita la opción del filtro de orden seleccionada o sino elegimos ninguna se selacciona la opción por defecto *****/

        const filterOrderOptions = document.querySelector(".filterOrderOptionsDropDownCont")?.childNodes as NodeListOf<HTMLParagraphElement>;
        if (filterOrderOptions) {
            const filterOrderOptionsArr = Array.from(filterOrderOptions);
            filterOrderOptionsArr.forEach((option) => option.classList.remove("filterOrderOptionsDropDowSelected"));
            const orderByToUse = filterState.orderBy || "default";
            const index = filterOrderOptionsArr.findIndex((option) => option.role === orderByToUse);
            if (index !== -1) {
                filterOrderOptionsArr[index].classList.add("filterOrderOptionsDropDowSelected");
            }
        }
                                         
    }, [pageNumberFromQuery, filterState, brandIdFromQuery, selectedCategories]);

    /******* Lógica para sincronizar categorías seleccionadas con el estado  *******/

    useEffect(() => {
        // Sync selectedCategories with filterState when categories change
        if (categoriesData.length > 0 && selectedCategories.length === 0 && categoriesArrInOBJ.length > 0) {
            setSelectedCategories(categoriesArrInOBJ);
        }
    }, [categoriesData, categoriesArrInOBJ]);

    const getCategories = (): number[] => {
        return selectedCategories;
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
                    con_descuento={data.con_descuento ? 1 : 0}
                    porcentaje_descuento={data.porcentaje_descuento}
                    precio_full={data.precio_full}
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

    const getSearchWords = (): string[] => {
        return filterState.searchWords;
    };

    const searchWordsQuery = () => {
        saveScrollPosition();
        saveInputsState();
        
        // Update filter state with current search words
        const searchInput = document.querySelector(".homePageFinderSearchInput") as HTMLInputElement;
        const searchWordsArr = searchInput?.value.split(" ") || [];
        const searchWordsArrWithoutSpaces = searchWordsArr.map((word) => word.trim());
        const searchWordsArrWithoutEmptyStrings = searchWordsArrWithoutSpaces.filter((word) => word !== "");
        
        setFilterState(prev => ({
            ...prev,
            searchWords: searchWordsArrWithoutEmptyStrings
        }));
        
        // Reset to page 1 when searching
        navigate(`/home?page=1&brand=${getCurrentBrandId()}`);
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

    const checkIfRange = (): [number, number] | null => {
        const minValue = priceMinRef.current?.value.trim() || "";
        const maxValue = priceMaxRef.current?.value.trim() || "";
        const filterPriceMinValue = parseFloat(minValue);
        const filterPriceMaxValue = parseFloat(maxValue);
        
        if (
            (isNaN(filterPriceMinValue) && minValue !== "")
            || filterPriceMinValue < 0
            || !filterPriceMaxValue
            || isNaN(filterPriceMaxValue)
            || filterPriceMaxValue < 0
            || filterPriceMaxValue < (filterPriceMinValue || 0)
        ) {
            return null;
        } else {
            return [(filterPriceMinValue || 0), filterPriceMaxValue];
        }
    };

    const getPriceRange = (): [number, number] | null => {
        return checkIfRange();
    };
    
    const searchByCategorieAndPriceRange = (newCategories?: number[]) => {
        saveScrollPosition();
        saveInputsState();
        
        // Get price range from refs
        const priceRangeValue = checkIfRange();
        
        // Use provided categories or current selectedCategories
        const categoriesToUse = newCategories !== undefined ? newCategories : selectedCategories;
        
        // Update filter state with current selected categories and price range
        setFilterState(prev => ({
            ...prev,
            categories: categoriesToUse,
            priceRange: priceRangeValue
        }));
        
        // Reset to page 1 when filtering
        navigate(`/home?page=1&brand=${getCurrentBrandId()}`);
    };

    // Toggle category selection (multi-select behavior)
    const handleCategoryToggle = (categoryId: number) => {
        const isCurrentlySelected = selectedCategories.includes(categoryId);
        let newCategories: number[];
        
        if (isCurrentlySelected) {
            // Deselect: remove from array
            newCategories = selectedCategories.filter(id => id !== categoryId);
        } else {
            // Select: add to array
            newCategories = [...selectedCategories, categoryId];
        }
        
        setSelectedCategories(newCategories);
        
        // Trigger search with new categories immediately
        saveScrollPosition();
        saveInputsState();
        const priceRangeValue = checkIfRange();
        setFilterState(prev => ({
            ...prev,
            categories: newCategories,
            priceRange: priceRangeValue
        }));
        navigate(`/home?page=1&brand=${getCurrentBrandId()}`);
    };

    const clearPriceRangeInputs = () => {
        if (priceMinRef.current) priceMinRef.current.value = "";
        if (priceMaxRef.current) priceMaxRef.current.value = "";
        setFilterState(prev => ({
            ...prev,
            priceRange: null
        }));
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
        setFilterState({
            searchWords: [],
            categories: [],
            priceRange: null,
            orderBy: "default"
        });
        setSelectedCategories([]);
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
        
        // Update filter state with new orderBy
        setFilterState(prev => ({
            ...prev,
            orderBy: orderByFromOptions
        }));
        
        // Reset to page 1 when changing order
        navigate(`/home?page=1&brand=${getCurrentBrandId()}`);
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
        
        // Update filterState for search suggestions
        setFilterState(prev => ({
            ...prev,
            searchWords: searchWordsArrWithoutEmptyStrings
        }));

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
            categoriesIdsArr: filterState.categories,
            priceRangeArr: filterState.priceRange ? (dolar ? [filterState.priceRange[0] * globalMultiplierRef.current, filterState.priceRange[1] * globalMultiplierRef.current] : [filterState.priceRange[0], filterState.priceRange[1]]) : [],
            orderBy: filterState.orderBy || "default",
            brand: getCurrentBrandId() || (activeBrandsRef.current.length > 0 ? activeBrandsRef.current[0].id.toString() : "")
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
                        {/* Brand Badge */}
                        {currentBrandImageSrc && (
                            <div className="homePageBrandBadge">
                                <span className="homePageBrandBadge_label">Marca</span>
                                <img 
                                    src={currentBrandImageSrc} 
                                    alt="Marca seleccionada" 
                                    className="homePageBrandBadge_logo"
                                />
                            </div>
                        )}
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
                            <div className="filtersShownTypes flex" role="group" aria-label="Filtrar por tipo">
                                {categoriesData.map((category) => {
                                    const isChecked = selectedCategories.includes(category.id);
                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            className={`filterInputCont flex ${isChecked ? "filterInputCont--checked" : ""}`}
                                            onClick={() => handleCategoryToggle(category.id)}
                                            aria-pressed={isChecked}
                                        >
                                            <span className={`filterCheckBox_toggle ${isChecked ? "filterCheckBox_toggle--checked" : ""}`} aria-hidden="true" />
                                            <span className="filterCategorieName">{category.nombre}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="filtersPriceRangeCont filtersShownInternalCont flex">
                            <p className="filterPriceRangeTitle">RANGO DE PRECIO</p>
                            <div className="filterPriceInputsCont flex">
                                <input 
                                    type="number" 
                                    className="filterPriceInput filterPriceInputMin" 
                                    ref={priceMinRef}
                                    defaultValue={filterState.priceRange ? filterState.priceRange[0] : ""} 
                                />
                                -
                                <input 
                                    type="number" 
                                    className="filterPriceInput filterPriceInputMax" 
                                    ref={priceMaxRef}
                                    defaultValue={filterState.priceRange ? filterState.priceRange[1] : ""} 
                                />
                            </div>
                            <button className="filterButton" onClick={() => searchByCategorieAndPriceRange()} disabled={isFilterLoading}>
                                {isFilterLoading ? <span className="filterButtonLoader"></span> : "Filtrar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Productos y paginación - wrapper always rendered for consistent spacing */}
            <div className={`homePagesIndexContainer flex ${productsFound === 0 ? "homePagesIndexContainer--empty" : ""}`}>
                {productsFound !== 0 && (
                    <>
                        <div 
                            className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                            onClick={ () => navigate(`/home?page=${calculatePreviousPage()}&brand=${getCurrentBrandId()}`) } 
                        >
                            ‹ 
                        </div>
                        {pagesIndex}
                        <div 
                            className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                            onClick={ () => navigate(`/home?page=${calculateNextPage()}&brand=${getCurrentBrandId()}`) } 
                        > 
                            › 
                        </div>
                    </>
                )}
            </div>
            <div className="homeProductsContainer flex wrap">
                {isFilterLoading || products === null ? renderSkeletons() : products}
            </div>
            {
                productsFound !== 0 &&
                <div className="homePagesIndexContainer flex">
                    <div 
                        className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                        onClick={ () => navigate(`/home?page=${calculatePreviousPage()}&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${getPriceRange()}&orderBy=${orderBy}&brand=${getCurrentBrandId()}`)  } 
                    > 
                        ‹ 
                    </div>
                    {pagesIndex}
                    <div 
                        className="homePaginationArrow homePaginationButton opcionHoverPinkTransition flex" 
                        onClick={ () => navigate(`/home?page=${calculateNextPage()}&searchWords=${getSearchWords()}&categories=${getCategories()}&priceRange=${getPriceRange()}&orderBy=${orderBy}&brand=${getCurrentBrandId()}`) } 
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
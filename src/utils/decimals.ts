export const formatDecimalPrice = (price: number, decimals = 2): string => {
    if (price === null || price === undefined || isNaN(price)) return "0";

    // Para decimal(12,4) necesitamos manejar hasta 4 decimales, pero mostrar según contexto
    const roundedPrice = Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return roundedPrice.toFixed(decimals);
};

/**
 * Formatea un precio en formato de moneda
 * @param price - El precio a formatear
 * @param currency - "USD" para dólares, "ARS" para pesos argentinos
 * @returns El precio formateado con símbolo de moneda
 */
export const formatCurrencyPrice = (price: number, currency: "USD" | "ARS"): string => {
    if (price === null || price === undefined || isNaN(price)) return currency === "USD" ? "USD 0.00" : "$ 0";

    if (currency === "USD") {
        return `USD ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
        // Formato pesos argentinos: $ 1.234 (sin decimales, separador de miles con punto)
        return `$ ${price.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
};
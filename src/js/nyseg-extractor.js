/**
 * NYSEG Bill Data Extractor
 * Extracts rate and usage data from NYSEG bill PDF text
 *
 * Note: PDF.js extracts text in a specific format where rates appear as:
 * "3990   kwh   07894 @   0. Delivery charge   314.97"
 * meaning the rate 0.07894 is split as "07894 @ 0."
 */

/**
 * Parse a date string in various formats
 * @param {string} dateStr - Date string like "February 11, 2025" or "01/09/25"
 * @returns {Date|null}
 */
function parseDate(dateStr) {
    if (!dateStr) return null;

    // Handle "MM/DD/YY" format
    const shortMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2})/);
    if (shortMatch) {
        const [, month, day, year] = shortMatch;
        const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
        return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }

    // Handle "Month DD, YYYY" format
    const longMatch = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (longMatch) {
        return new Date(dateStr);
    }

    return null;
}

/**
 * Extract a number from a string, handling commas
 * @param {string} str - String containing a number
 * @returns {number}
 */
function parseNumber(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/,/g, '')) || 0;
}

/**
 * Reconstruct a rate from the split format
 * PDF.js extracts "@ 0.07894" as "07894 @ 0."
 * This function takes "07894" and returns 0.07894
 * @param {string} rateDigits - The digits after the decimal (e.g., "07894")
 * @returns {number}
 */
function reconstructRate(rateDigits) {
    if (!rateDigits) return 0;
    return parseFloat('0.' + rateDigits) || 0;
}

/**
 * Extract bill data from PDF text
 * @param {string} text - Extracted PDF text
 * @param {string} fileName - Original file name for reference
 * @returns {Object} Extracted bill data
 */
/**
 * Extract account information from PDF text
 * @param {string} text - Extracted PDF text
 * @returns {Object} Account info
 */
export function extractAccountInfo(text) {
    const info = {
        accountNumber: '',
        customerName: '',
        serviceAddress: ''
    };

    // Account Number - NYSEG format: "XXXX-XXXX-XXX" (4-4-3 with dashes)
    const accountMatch = text.match(/(\d{4}-\d{4}-\d{3})/);
    if (accountMatch) {
        info.accountNumber = accountMatch[1].trim();
    }

    // Customer Name - all caps name, typically "FIRSTNAME LASTNAME"
    // Exclude common address/utility words
    const nameMatch = text.match(/\b([A-Z][A-Z]+\s+[A-Z][A-Z]+)\b/g);
    if (nameMatch) {
        const excludeWords = [
            // Street suffixes
            'ST', 'RD', 'AVE', 'DR', 'LN', 'CT', 'WAY', 'BLVD', 'PL', 'CIR', 'DRIVE', 'STREET', 'ROAD', 'AVENUE', 'LANE', 'COURT',
            // Locations
            'BOSTON', 'LANSING', 'NY', 'MA',
            // Utility terms
            'NYSEG', 'SERVICE', 'ACCOUNT', 'STATEMENT', 'BUDGET', 'BILLING', 'PAYMENT', 'AUTOPAY',
            'RESIDENTIAL', 'SUMMARY', 'BALANCE', 'PROJECT', 'SHARE', 'HEATING', 'FUND', 'PAGE',
            'BANK', 'ENERGY', 'ELECTRIC', 'NATURAL', 'GAS', 'DELIVERY', 'SUPPLY', 'TOTAL', 'AMOUNT'
        ];
        for (const match of nameMatch) {
            const words = match.split(/\s+/);
            const isExcluded = words.some(w => excludeWords.includes(w) || w.length < 2);
            if (!isExcluded && words.length === 2) {
                info.customerName = match;
                break;
            }
        }
    }

    // Service Address - look for street address pattern
    // Format: "123 STREET NAME DR/ST/etc" followed by city/state
    const addressMatch = text.match(/(\d+\s+[A-Z][A-Z\s]+(?:ST|RD|AVE|DR|LN|CT|WAY|BLVD|PL|CIR)\.?),?\s*([A-Z][A-Z]+,?\s*NY\s*\d{5})/i);
    if (addressMatch) {
        info.serviceAddress = (addressMatch[1] + ', ' + addressMatch[2]).trim();
    }

    return info;
}

export function extractBillData(text, fileName) {
    const data = {
        fileName,
        statementDate: null,
        servicePeriod: {
            start: null,
            end: null,
            days: 0
        },
        electricity: {
            usage: 0,
            basicServiceCharge: 0,
            deliveryRate: 0,
            deliveryCharge: 0,
            transitionRate: 0,
            transitionCharge: 0,
            sbcRate: 0,
            sbcCharge: 0,
            supplyRate: 0,
            supplyCharge: 0,
            totalDelivery: 0,
            totalSupply: 0,
            totalTaxes: 0,
            totalCost: 0
        },
        gas: {
            usageCcf: 0,
            usageTherms: 0,
            basicServiceCharge: 0,
            deliveryRate: 0,
            deliveryCharge: 0,
            supplyRate: 0,
            supplyCharge: 0,
            totalDelivery: 0,
            totalSupply: 0,
            totalTaxes: 0,
            totalCost: 0
        },
        totalEnergyCharges: 0,
        amountDue: 0
    };

    // Statement Date - format: "Statement Date: February 11, 2025"
    const statementDateMatch = text.match(/Statement\s+Date:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i);
    if (statementDateMatch) {
        data.statementDate = parseDate(statementDateMatch[1]);
    }

    // Service Period - may be on separate line from "Service from:"
    // Look for pattern: "01/09/25 - 02/07/25"
    const servicePeriodMatch = text.match(/(\d{2}\/\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2}\/\d{2})/);
    if (servicePeriodMatch) {
        data.servicePeriod.start = parseDate(servicePeriodMatch[1]);
        data.servicePeriod.end = parseDate(servicePeriodMatch[2]);
    }

    // Billing Period (days) and kWh - format: "30 days 3990 kwh" or "3990 kwh 30 days"
    const daysKwhMatch = text.match(/(\d+)\s*days\s+(\d+)\s*kwh/i);
    if (daysKwhMatch) {
        data.servicePeriod.days = parseInt(daysKwhMatch[1]);
        data.electricity.usage = parseInt(daysKwhMatch[2]);
    } else {
        const kwhDaysMatch = text.match(/(\d+)\s*kwh\s+(\d+)\s*days/i);
        if (kwhDaysMatch) {
            data.electricity.usage = parseInt(kwhDaysMatch[1]);
            data.servicePeriod.days = parseInt(kwhDaysMatch[2]);
        }
    }

    // === ELECTRICITY ===

    // Basic Service Charge - format: "Basic service charge   19.00"
    const elecBasicMatch = text.match(/Basic\s+service\s+charge\s+([\d,.]+)/i);
    if (elecBasicMatch) {
        data.electricity.basicServiceCharge = parseNumber(elecBasicMatch[1]);
    }

    // Delivery Charge - two possible formats:
    // 1. Simple: "3990   kwh   07894 @   0. Delivery charge   314.97"
    // 2. Split by month: "Delivery charge - March   1234   kwh   07894 @   0.   123.45"
    //                    "Delivery charge - April    567   kwh   09783 @   0.    56.78"

    // Try simple format first
    const deliveryMatch = text.match(/(\d+)\s+kwh\s+(\d+)\s*@\s*0\.\s*Delivery\s+charge\s+([\d,.]+)/i);
    if (deliveryMatch) {
        data.electricity.deliveryRate = reconstructRate(deliveryMatch[2]);
        data.electricity.deliveryCharge = parseNumber(deliveryMatch[3]);
    }

    // Try split-by-month format if simple didn't work
    // Actual format from PDF.js: "1297 kwh   07894 @   0. Delivery charge - Apr   102.39"
    // Pattern: {kwh} kwh {rate_digits} @ 0. Delivery charge - {Month} {charge}
    if (data.electricity.deliveryRate === 0) {
        const deliveryMonthMatches = [...text.matchAll(/(\d+)\s+kwh\s+(\d+)\s*@\s*0\.\s*Delivery\s+charge\s*-\s*\w+\s+([\d,.]+)/gi)];
        if (deliveryMonthMatches.length > 0) {
            let totalKwh = 0;
            let weightedRate = 0;
            let totalCharge = 0;

            for (const match of deliveryMonthMatches) {
                const kwh = parseInt(match[1]);
                const rate = reconstructRate(match[2]);
                const charge = parseNumber(match[3]);
                totalKwh += kwh;
                weightedRate += kwh * rate;
                totalCharge += charge;
            }

            data.electricity.deliveryRate = totalKwh > 0 ? weightedRate / totalKwh : 0;
            data.electricity.deliveryCharge = totalCharge;
        }
    }

    // Transition Charge - format: "{kwh} kwh {rate_digits} @ 0. Transition charge {charge}"
    // Or with month: "{kwh} kwh {rate_digits} @ 0. Transition charge - {Month} {charge}"
    const transitionMatch = text.match(/(\d+)\s+kwh\s+(\d+)\s*@\s*0\.\s*Transition\s+charge\s+([\d,.]+)/i);
    if (transitionMatch) {
        data.electricity.transitionRate = reconstructRate(transitionMatch[2]);
        data.electricity.transitionCharge = parseNumber(transitionMatch[3]);
    }
    if (data.electricity.transitionRate === 0) {
        const transitionMonthMatches = [...text.matchAll(/(\d+)\s+kwh\s+(\d+)\s*@\s*0\.\s*Transition\s+charge\s*-\s*\w+\s+([\d,.]+)/gi)];
        if (transitionMonthMatches.length > 0) {
            let totalKwh = 0;
            let weightedRate = 0;
            let totalCharge = 0;
            for (const match of transitionMonthMatches) {
                const kwh = parseInt(match[1]);
                const rate = reconstructRate(match[2]);
                const charge = parseNumber(match[3]);
                totalKwh += kwh;
                weightedRate += kwh * rate;
                totalCharge += charge;
            }
            data.electricity.transitionRate = totalKwh > 0 ? weightedRate / totalKwh : 0;
            data.electricity.transitionCharge = totalCharge;
        }
    }

    // SBC Charge - format: "{kwh} kwh {rate_digits} @ 0. SBC charge {charge}"
    // Or with month: "{kwh} kwh {rate_digits} @ 0. SBC charge - {Month} {charge}"
    const sbcMatch = text.match(/(\d+)\s+kwh\s+(\d+)\s*@\s*0\.\s*SBC\s+charge\s+([\d,.]+)/i);
    if (sbcMatch) {
        data.electricity.sbcRate = reconstructRate(sbcMatch[2]);
        data.electricity.sbcCharge = parseNumber(sbcMatch[3]);
    }
    if (data.electricity.sbcRate === 0) {
        const sbcMonthMatches = [...text.matchAll(/(\d+)\s+kwh\s+(\d+)\s*@\s*0\.\s*SBC\s+charge\s*-\s*\w+\s+([\d,.]+)/gi)];
        if (sbcMonthMatches.length > 0) {
            let totalKwh = 0;
            let weightedRate = 0;
            let totalCharge = 0;
            for (const match of sbcMonthMatches) {
                const kwh = parseInt(match[1]);
                const rate = reconstructRate(match[2]);
                const charge = parseNumber(match[3]);
                totalKwh += kwh;
                weightedRate += kwh * rate;
                totalCharge += charge;
            }
            data.electricity.sbcRate = totalKwh > 0 ? weightedRate / totalKwh : 0;
            data.electricity.sbcCharge = totalCharge;
        }
    }

    // Subtotal Electricity Delivery
    const elecDeliveryTotalMatch = text.match(/Subtotal\s+Electricity\s+Delivery\s+\$?([\d,.]+)/i);
    if (elecDeliveryTotalMatch) {
        data.electricity.totalDelivery = parseNumber(elecDeliveryTotalMatch[1]);
    }

    // Supply Charge - format: "Supply charge   3990   kwh   08395531 @   0.   334.98"
    // Note: Supply charge format is different - "Supply charge" comes BEFORE the kwh
    const supplyMatch = text.match(/Supply\s+charge\s+(\d+)\s+kwh\s+(\d+)\s*@\s*0\.\s+([\d,.]+)/i);
    if (supplyMatch) {
        data.electricity.supplyRate = reconstructRate(supplyMatch[2]);
        data.electricity.supplyCharge = parseNumber(supplyMatch[3]);
    }

    // Subtotal Electricity Supply
    const elecSupplyTotalMatch = text.match(/Subtotal\s+Electricity\s+Supply\s+\$?([\d,.]+)/i);
    if (elecSupplyTotalMatch) {
        data.electricity.totalSupply = parseNumber(elecSupplyTotalMatch[1]);
    }

    // Electricity Taxes
    const elecTaxMatch = text.match(/Subtotal\s+Electricity\s+Taxes\s+and\s+Surcharges\s+\$?([\d,.]+)/i);
    if (elecTaxMatch) {
        data.electricity.totalTaxes = parseNumber(elecTaxMatch[1]);
    }

    // Total Electricity Cost
    const elecTotalMatch = text.match(/Total\s+Electricity\s+Cost\s+\$?([\d,.]+)/i);
    if (elecTotalMatch) {
        data.electricity.totalCost = parseNumber(elecTotalMatch[1]);
    }

    // === NATURAL GAS ===

    // Gas Usage in CCF - format: "Natural gas used (ccf)   46"
    const gasCcfMatch = text.match(/Natural\s+gas\s+used\s*\(ccf\)\s*([\d.]+)/i);
    if (gasCcfMatch) {
        data.gas.usageCcf = parseNumber(gasCcfMatch[1]);
    }

    // Gas Usage in Therms - format: "Natural gas used (therm)   47.2"
    const gasThermMatch = text.match(/Natural\s+gas\s+used\s*\(therm\)\s*([\d.]+)/i);
    if (gasThermMatch) {
        data.gas.usageTherms = parseNumber(gasThermMatch[1]);
    }

    // Gas Basic Service Charge - need to find it in gas section
    // Format: "Basic service charge   20.30" (but must be in gas section)
    // Look for pattern after "Natural Gas Delivery Charges"
    const gasBasicMatch = text.match(/Natural\s+Gas\s+Delivery\s+Charges[\s\S]*?Basic\s+service\s+charge\s+([\d,.]+)/i);
    if (gasBasicMatch) {
        data.gas.basicServiceCharge = parseNumber(gasBasicMatch[1]);
    }

    // Gas Delivery Charge - formats:
    // Simple: "Delivery charge   44.2   therm   73822 @   0.   32.63"
    // With month: "Delivery charge - Apr   16.5   therm   73822 @   0.   12.18"

    // Try simple format (no month): "Delivery charge {therms} therm {rate_digits} @ 0. {charge}"
    const gasDeliverySimple = text.match(/Delivery\s+charge\s+([\d.]+)\s+therm\s+(\d+)\s*@\s*0\.\s+([\d,.]+)/i);
    if (gasDeliverySimple) {
        data.gas.deliveryRate = reconstructRate(gasDeliverySimple[2]);
        data.gas.deliveryCharge = parseNumber(gasDeliverySimple[3]);
    }

    // Try multi-month format if simple didn't work
    if (data.gas.deliveryRate === 0) {
        const gasDeliveryMonthMatches = [...text.matchAll(/Delivery\s+charge\s*-\s*\w+\s+([\d.]+)\s+therm\s+(\d+)\s*@\s*0\.\s+([\d,.]+)/gi)];
        if (gasDeliveryMonthMatches.length > 0) {
            let totalTherms = 0;
            let weightedRate = 0;
            let totalCharge = 0;
            for (const match of gasDeliveryMonthMatches) {
                const therms = parseNumber(match[1]);
                const rate = reconstructRate(match[2]);
                const charge = parseNumber(match[3]);
                totalTherms += therms;
                weightedRate += therms * rate;
                totalCharge += charge;
            }
            data.gas.deliveryRate = totalTherms > 0 ? weightedRate / totalTherms : 0;
            data.gas.deliveryCharge = totalCharge;
        }
    }

    // Gas Supply Charges - may have multiple months
    // Format: "Supply charge - {Month}   {therms}   therm   {rate_digits} @   0.   {charge}"
    // Or with full decimal: "Supply charge - April 18.5 therm @ 0.61252 11.33"

    // Try format with split rate (rate_digits @ 0.)
    const gasSupplyMatches = [...text.matchAll(/Supply\s+charge\s*-\s*\w+\s+([\d.]+)\s+therm\s+(\d+)\s*@\s*0\.\s+([\d,.]+)/gi)];
    if (gasSupplyMatches.length > 0) {
        let totalTherms = 0;
        let weightedRate = 0;
        let totalCharge = 0;

        for (const match of gasSupplyMatches) {
            const therms = parseNumber(match[1]);
            const rate = reconstructRate(match[2]);
            const charge = parseNumber(match[3]);
            totalTherms += therms;
            weightedRate += therms * rate;
            totalCharge += charge;
        }

        data.gas.supplyRate = totalTherms > 0 ? weightedRate / totalTherms : 0;
        data.gas.supplyCharge = totalCharge;
    }

    // Try format with full decimal rate if split format didn't work
    if (data.gas.supplyRate === 0) {
        const gasSupplyStdMatches = [...text.matchAll(/Supply\s+charge\s*-\s*\w+\s+([\d.]+)\s+therm\s*@\s*([\d.]+)\s+([\d,.]+)/gi)];
        if (gasSupplyStdMatches.length > 0) {
            let totalTherms = 0;
            let weightedRate = 0;
            let totalCharge = 0;

            for (const match of gasSupplyStdMatches) {
                const therms = parseNumber(match[1]);
                const rate = parseNumber(match[2]);
                const charge = parseNumber(match[3]);
                totalTherms += therms;
                weightedRate += therms * rate;
                totalCharge += charge;
            }

            data.gas.supplyRate = totalTherms > 0 ? weightedRate / totalTherms : 0;
            data.gas.supplyCharge = totalCharge;
        }
    }

    // Subtotal Natural Gas Delivery
    const gasDeliveryTotalMatch = text.match(/Subtotal\s+Natural\s+Gas\s+Delivery\s+\$?([\d,.]+)/i);
    if (gasDeliveryTotalMatch) {
        data.gas.totalDelivery = parseNumber(gasDeliveryTotalMatch[1]);
    }

    // Subtotal Natural Gas Supply
    const gasSupplyTotalMatch = text.match(/Subtotal\s+Natural\s+Gas\s+Supply\s+\$?([\d,.]+)/i);
    if (gasSupplyTotalMatch) {
        data.gas.totalSupply = parseNumber(gasSupplyTotalMatch[1]);
    }

    // Gas Taxes
    const gasTaxMatch = text.match(/Subtotal\s+Natural\s+Gas\s+Taxes\s+and\s+Surcharges\s+\$?([\d,.]+)/i);
    if (gasTaxMatch) {
        data.gas.totalTaxes = parseNumber(gasTaxMatch[1]);
    }

    // Total Natural Gas Cost
    const gasTotalMatch = text.match(/Total\s+Natural\s+Gas\s+Cost\s+\$?([\d,.]+)/i);
    if (gasTotalMatch) {
        data.gas.totalCost = parseNumber(gasTotalMatch[1]);
    }

    // === TOTALS ===

    // Total Energy Charges
    const totalEnergyMatch = text.match(/Total\s+Energy\s+Charges\s+\$?([\d,.]+)/i);
    if (totalEnergyMatch) {
        data.totalEnergyCharges = parseNumber(totalEnergyMatch[1]);
    }

    // Amount Due
    const amountDueMatch = text.match(/Amount\s+Due:?\s+\$?([\d,.]+)/i);
    if (amountDueMatch) {
        data.amountDue = parseNumber(amountDueMatch[1]);
    }

    // Calculate billing days if not found but we have dates
    if (data.servicePeriod.days === 0 && data.servicePeriod.start && data.servicePeriod.end) {
        const diffTime = Math.abs(data.servicePeriod.end - data.servicePeriod.start);
        data.servicePeriod.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return data;
}

/**
 * Format a date for display
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format a date for chart labels
 * @param {Date} date
 * @returns {string}
 */
export function formatDateShort(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
        year: '2-digit',
        month: 'short'
    });
}

/**
 * Format currency
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

/**
 * Format rate (more decimal places)
 * @param {number} rate
 * @returns {string}
 */
export function formatRate(rate) {
    return '$' + rate.toFixed(5);
}

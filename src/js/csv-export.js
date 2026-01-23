/**
 * CSV Export Module
 * Generates and downloads CSV files from bill data
 */

/**
 * Format a date for CSV export
 * @param {Date} date
 * @returns {string}
 */
function formatDateCSV(date) {
    if (!date) return '';
    return date.toISOString().split('T')[0];
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 * @param {any} value
 * @returns {string}
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Generate CSV content from bill data
 * @param {Array} bills - Array of extracted bill data
 * @param {Object} accountInfo - Account information
 * @returns {string} CSV content
 */
export function generateCSV(bills, accountInfo = {}) {
    // Sort bills by statement date
    const sortedBills = [...bills].sort((a, b) => {
        if (!a.statementDate || !b.statementDate) return 0;
        return a.statementDate - b.statementDate;
    });

    // Define CSV headers
    const headers = [
        'Statement Date',
        'Service Start',
        'Service End',
        'Days',
        'Avg Daily Temp (°F)',
        // Electricity
        'Electric kWh',
        'Electric Basic Service ($)',
        'Electric Delivery Rate ($/kWh)',
        'Electric Delivery ($)',
        'Electric Transition Rate ($/kWh)',
        'Electric Transition ($)',
        'Electric SBC Rate ($/kWh)',
        'Electric SBC ($)',
        'Electric Supply Rate ($/kWh)',
        'Electric Supply ($)',
        'Electric Delivery Total ($)',
        'Electric Supply Total ($)',
        'Electric Taxes ($)',
        'Electric Total ($)',
        // Gas
        'Gas CCF',
        'Gas Therms',
        'Gas Basic Service ($)',
        'Gas Delivery Rate ($/therm)',
        'Gas Delivery ($)',
        'Gas Supply Rate ($/therm)',
        'Gas Supply ($)',
        'Gas Delivery Total ($)',
        'Gas Supply Total ($)',
        'Gas Taxes ($)',
        'Gas Total ($)',
        // Totals
        'Miscellaneous Charges ($)',
        'Total Charges ($)',
        'Amount Due ($)'
    ];

    // Build CSV rows
    const rows = sortedBills.map(bill => [
        formatDateCSV(bill.statementDate),
        formatDateCSV(bill.servicePeriod.start),
        formatDateCSV(bill.servicePeriod.end),
        bill.servicePeriod.days,
        bill.averageDailyTemp !== null ? bill.averageDailyTemp : '',
        // Electricity
        bill.electricity.usage,
        bill.electricity.basicServiceCharge.toFixed(2),
        bill.electricity.deliveryRate.toFixed(6),
        bill.electricity.deliveryCharge.toFixed(2),
        bill.electricity.transitionRate.toFixed(7),
        bill.electricity.transitionCharge.toFixed(2),
        bill.electricity.sbcRate.toFixed(6),
        bill.electricity.sbcCharge.toFixed(2),
        bill.electricity.supplyRate.toFixed(8),
        bill.electricity.supplyCharge.toFixed(2),
        bill.electricity.totalDelivery.toFixed(2),
        bill.electricity.totalSupply.toFixed(2),
        bill.electricity.totalTaxes.toFixed(2),
        bill.electricity.totalCost.toFixed(2),
        // Gas
        bill.gas.usageCcf.toFixed(1),
        bill.gas.usageTherms.toFixed(2),
        bill.gas.basicServiceCharge.toFixed(2),
        bill.gas.deliveryRate.toFixed(5),
        bill.gas.deliveryCharge.toFixed(2),
        bill.gas.supplyRate.toFixed(6),
        bill.gas.supplyCharge.toFixed(2),
        bill.gas.totalDelivery.toFixed(2),
        bill.gas.totalSupply.toFixed(2),
        bill.gas.totalTaxes.toFixed(2),
        bill.gas.totalCost.toFixed(2),
        // Totals
        bill.miscellaneousCharges.toFixed(2),
        bill.totalEnergyCharges.toFixed(2),
        bill.amountDue.toFixed(2)
    ]);

    // Build account info section
    const accountSection = [];
    if (accountInfo.accountNumber || accountInfo.customerName || accountInfo.serviceAddress) {
        accountSection.push('Account Information');
        if (accountInfo.accountNumber) {
            accountSection.push(`Account Number,${escapeCSV(accountInfo.accountNumber)}`);
        }
        if (accountInfo.customerName) {
            accountSection.push(`Customer Name,${escapeCSV(accountInfo.customerName)}`);
        }
        if (accountInfo.serviceAddress) {
            accountSection.push(`Service Address,${escapeCSV(accountInfo.serviceAddress)}`);
        }
        accountSection.push(''); // Empty line before data
    }

    // Combine headers and rows
    const csvContent = [
        ...accountSection,
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    return csvContent;
}

/**
 * Download CSV file
 * @param {Array} bills - Array of extracted bill data
 * @param {string} filename - Desired filename (without extension)
 * @param {Object} accountInfo - Account information
 */
export function downloadCSV(bills, filename = 'nyseg-bills', accountInfo = {}) {
    const csvContent = generateCSV(bills, accountInfo);

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
}

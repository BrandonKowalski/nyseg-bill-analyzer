/**
 * NYSEG Bill Analyzer - Main Application
 */

import { processMultiplePDFs } from './pdf-parser.js';
import { extractBillData, extractAccountInfo, formatDate, formatCurrency, formatRate } from './nyseg-extractor.js';
import { initCharts, updateCharts, clearCharts, highlightDataPoint, getCharts } from './charts.js';
import { downloadCSV } from './csv-export.js';

// Application state
const state = {
    bills: [],
    errors: [],
    accountInfo: {
        accountNumber: '',
        customerName: '',
        serviceAddress: ''
    }
};

// DOM elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const processingStatus = document.getElementById('processing-status');
const resultsSection = document.getElementById('results-section');
const errorSection = document.getElementById('error-section');
const errorList = document.getElementById('error-list');
const tableBody = document.getElementById('table-body');
const exportBtn = document.getElementById('export-csv-btn');
const uploadMoreBtn = document.getElementById('upload-more-btn');
const clearBtn = document.getElementById('clear-data-btn');
const accountNumberEl = document.getElementById('account-number');
const customerNameEl = document.getElementById('customer-name');
const serviceAddressEl = document.getElementById('service-address');
const billsLoadedEl = document.getElementById('bills-loaded');
const dateRangeEl = document.getElementById('date-range');
const privacyNoticeTop = document.getElementById('privacy-notice-top');
const footer = document.getElementById('footer');
const uploadSection = document.getElementById('upload-section');
const header = document.querySelector('header');

/**
 * Initialize the application
 */
function init() {
    // Initialize charts
    initCharts();

    // Set up chart hover callbacks for synchronized highlighting
    setupChartHoverSync();

    // Set up event listeners
    setupDragAndDrop();
    setupFileInput();
    setupButtons();
}

// Track the last highlighted index from chart hover
let lastChartHighlightIndex = null;

/**
 * Set up chart hover synchronization
 */
function setupChartHoverSync() {
    const charts = getCharts();

    for (const chart of charts) {
        // Handle hover on chart points
        chart.options.onHover = (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;

                // Only update if index changed
                if (index !== lastChartHighlightIndex) {
                    // Highlight all charts
                    highlightDataPoint(index);

                    // Clear previous table highlight
                    const rows = tableBody.querySelectorAll('tr');
                    rows.forEach(row => row.classList.remove('highlighted'));

                    // Highlight table row
                    const row = tableBody.querySelector(`tr[data-index="${index}"]`);
                    if (row) {
                        row.classList.add('highlighted');
                    }
                    lastChartHighlightIndex = index;
                }
            }
        };

        // Get the canvas element to add mouseleave handler
        const canvas = chart.canvas;
        canvas.addEventListener('mouseleave', () => {
            // Clear all highlights when mouse leaves chart
            highlightDataPoint(null);
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach(row => row.classList.remove('highlighted'));
            lastChartHighlightIndex = null;
        });

        chart.update('none');
    }
}

/**
 * Set up drag and drop handlers
 */
function setupDragAndDrop() {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (files.length > 0) {
            processFiles(files);
        }
    });
}

/**
 * Set up file input handler
 */
function setupFileInput() {
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            processFiles(files);
        }
        // Reset input so same files can be selected again
        fileInput.value = '';
    });
}

/**
 * Set up button handlers
 */
function setupButtons() {
    exportBtn.addEventListener('click', () => {
        if (state.bills.length > 0) {
            const dateStr = new Date().toISOString().split('T')[0];
            downloadCSV(state.bills, `nyseg-bills-${dateStr}`, state.accountInfo);
        }
    });

    uploadMoreBtn.addEventListener('click', () => {
        fileInput.click();
    });

    clearBtn.addEventListener('click', () => {
        state.bills = [];
        state.errors = [];
        state.accountInfo = { accountNumber: '', customerName: '', serviceAddress: '' };
        updateUI();
        clearCharts();
        resultsSection.classList.add('hidden');
        errorSection.classList.add('hidden');
        // Reset to initial state
        uploadSection.classList.remove('hidden');
        privacyNoticeTop.classList.remove('hidden');
        header.classList.remove('hidden');
        footer.classList.add('hidden');
    });
}

/**
 * Process uploaded PDF files
 * @param {File[]} files
 */
async function processFiles(files) {
    // Show processing status
    processingStatus.classList.remove('hidden');
    processingStatus.querySelector('span').textContent = `Processing ${files.length} file(s)...`;

    try {
        // Extract text from PDFs
        const results = await processMultiplePDFs(files, (current, total, name) => {
            processingStatus.querySelector('span').textContent = `Processing ${current}/${total}: ${name}`;
        });

        // Process each result
        for (const result of results) {
            if (result.error) {
                state.errors.push({
                    fileName: result.file.name,
                    error: result.error
                });
            } else {
                try {
                    const billData = extractBillData(result.text, result.file.name);

                    // Extract account info if not already set
                    if (!state.accountInfo.accountNumber) {
                        const accountInfo = extractAccountInfo(result.text);
                        if (accountInfo.accountNumber) {
                            state.accountInfo = accountInfo;
                        }
                    }

                    // Check if we already have this bill (by statement date)
                    const existingIndex = state.bills.findIndex(b =>
                        b.statementDate && billData.statementDate &&
                        b.statementDate.getTime() === billData.statementDate.getTime()
                    );

                    if (existingIndex >= 0) {
                        // Replace existing bill
                        state.bills[existingIndex] = billData;
                    } else {
                        state.bills.push(billData);
                    }
                } catch (extractError) {
                    state.errors.push({
                        fileName: result.file.name,
                        error: extractError.message
                    });
                }
            }
        }

        // Sort bills by date
        state.bills.sort((a, b) => {
            if (!a.statementDate || !b.statementDate) return 0;
            return a.statementDate - b.statementDate;
        });

        // Update UI
        updateUI();
        updateCharts(state.bills);

        // Show results
        if (state.bills.length > 0) {
            resultsSection.classList.remove('hidden');
            // Hide upload section, header, and move privacy notice to footer
            uploadSection.classList.add('hidden');
            privacyNoticeTop.classList.add('hidden');
            header.classList.add('hidden');
            footer.classList.remove('hidden');
        }

        // Show errors if any
        if (state.errors.length > 0) {
            errorSection.classList.remove('hidden');
            renderErrors();
        }

    } catch (error) {
        console.error('Processing error:', error);
        state.errors.push({
            fileName: 'General',
            error: error.message
        });
        errorSection.classList.remove('hidden');
        renderErrors();
    } finally {
        processingStatus.classList.add('hidden');
    }
}

/**
 * Update the UI with current state
 */
function updateUI() {
    // Update account info
    accountNumberEl.textContent = state.accountInfo.accountNumber || '-';
    customerNameEl.textContent = state.accountInfo.customerName || '-';
    serviceAddressEl.textContent = state.accountInfo.serviceAddress || '-';

    // Update bills loaded count
    billsLoadedEl.textContent = state.bills.length;

    // Update date range
    if (state.bills.length > 0) {
        const sortedBills = [...state.bills].sort((a, b) => {
            if (!a.statementDate || !b.statementDate) return 0;
            return a.statementDate - b.statementDate;
        });
        const firstDate = sortedBills[0].statementDate;
        const lastDate = sortedBills[sortedBills.length - 1].statementDate;
        if (firstDate && lastDate) {
            const formatShort = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            dateRangeEl.textContent = `${formatShort(firstDate)} - ${formatShort(lastDate)}`;
        } else {
            dateRangeEl.textContent = '-';
        }
    } else {
        dateRangeEl.textContent = '-';
    }

    // Render table
    renderTable();
}

/**
 * Render the data table
 */
function renderTable() {
    tableBody.innerHTML = '';

    state.bills.forEach((bill, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;

        const servicePeriod = bill.servicePeriod.start && bill.servicePeriod.end
            ? `${formatDate(bill.servicePeriod.start)} - ${formatDate(bill.servicePeriod.end)}`
            : 'N/A';

        const tempDisplay = bill.averageDailyTemp !== null ? `${bill.averageDailyTemp}°F` : '-';

        row.innerHTML = `
            <td>${formatDate(bill.statementDate)}</td>
            <td>${servicePeriod}</td>
            <td>${bill.servicePeriod.days}</td>
            <td>${tempDisplay}</td>
            <td>${bill.electricity.usage.toLocaleString()}</td>
            <td>${formatRate(bill.electricity.deliveryRate)}</td>
            <td>${formatRate(bill.electricity.supplyRate)}</td>
            <td>${formatCurrency(bill.electricity.totalCost)}</td>
            <td>${bill.gas.usageTherms.toFixed(1)}</td>
            <td>${formatRate(bill.gas.deliveryRate)}</td>
            <td>${formatRate(bill.gas.supplyRate)}</td>
            <td>${formatCurrency(bill.gas.totalCost)}</td>
            <td><strong>${formatCurrency(bill.totalEnergyCharges)}</strong></td>
        `;

        // Add hover events for synchronized highlighting
        row.addEventListener('mouseenter', () => {
            highlightDataPoint(index);
            row.classList.add('highlighted');
        });

        row.addEventListener('mouseleave', () => {
            highlightDataPoint(null);
            row.classList.remove('highlighted');
        });

        tableBody.appendChild(row);
    });
}

/**
 * Render error list
 */
function renderErrors() {
    errorList.innerHTML = '';

    for (const err of state.errors) {
        const li = document.createElement('li');
        li.textContent = `${err.fileName}: ${err.error}`;
        errorList.appendChild(li);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

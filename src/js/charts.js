/**
 * Chart Manager Module
 * Handles Chart.js chart creation and updates
 */

import { formatDateShort } from './nyseg-extractor.js';

// Chart instances
let electricityUsageChart = null;
let gasUsageChart = null;
let electricityRatesChart = null;
let gasRatesChart = null;
let totalCostChart = null;

// Common chart options
const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
        mode: 'index',
        intersect: false
    },
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                usePointStyle: true,
                padding: 20
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: '#e2e8f0'
            }
        }
    }
};

// Color palette - consistent colors for each utility type
const colors = {
    electric: {
        main: 'rgb(37, 99, 235)',        // Blue
        light: 'rgba(37, 99, 235, 0.1)',
        supply: 'rgb(37, 99, 235)',       // Blue (solid)
        delivery: 'rgb(96, 165, 250)'     // Light blue
    },
    gas: {
        main: 'rgb(234, 88, 12)',         // Orange
        light: 'rgba(234, 88, 12, 0.1)',
        supply: 'rgb(234, 88, 12)',       // Orange (solid)
        delivery: 'rgb(251, 146, 60)'     // Light orange
    }
};

/**
 * Initialize all charts
 */
export function initCharts() {
    // Electricity Usage Chart
    const elecUsageCtx = document.getElementById('electricity-usage-chart').getContext('2d');
    electricityUsageChart = new Chart(elecUsageCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'kWh',
                data: [],
                borderColor: colors.electric.main,
                backgroundColor: colors.electric.light,
                pointBackgroundColor: colors.electric.main,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y.toLocaleString()} kWh`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'kWh'
                    }
                }
            }
        }
    });

    // Gas Usage Chart
    const gasUsageCtx = document.getElementById('gas-usage-chart').getContext('2d');
    gasUsageChart = new Chart(gasUsageCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Therms',
                data: [],
                borderColor: colors.gas.main,
                backgroundColor: colors.gas.light,
                pointBackgroundColor: colors.gas.main,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y.toFixed(1)} therms`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Therms'
                    }
                }
            }
        }
    });

    // Electricity Rates Chart
    const elecRatesCtx = document.getElementById('electricity-rates-chart').getContext('2d');
    electricityRatesChart = new Chart(elecRatesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Supply Rate',
                    data: [],
                    borderColor: colors.electric.supply,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.electric.supply,
                    tension: 0.3,
                    pointRadius: 4
                },
                {
                    label: 'Delivery Rate',
                    data: [],
                    borderColor: colors.electric.delivery,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.electric.delivery,
                    tension: 0.3,
                    pointRadius: 4
                }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(5)}/kWh`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: '$/kWh'
                    }
                }
            }
        }
    });

    // Gas Rates Chart
    const gasRatesCtx = document.getElementById('gas-rates-chart').getContext('2d');
    gasRatesChart = new Chart(gasRatesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Supply Rate',
                    data: [],
                    borderColor: colors.gas.supply,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.gas.supply,
                    tension: 0.3,
                    pointRadius: 4
                },
                {
                    label: 'Delivery Rate',
                    data: [],
                    borderColor: colors.gas.delivery,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.gas.delivery,
                    tension: 0.3,
                    pointRadius: 4
                }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(4)}/therm`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: '$/Therm'
                    }
                }
            }
        }
    });

    // Total Cost Chart
    const totalCostCtx = document.getElementById('total-cost-chart').getContext('2d');
    totalCostChart = new Chart(totalCostCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Electricity',
                    data: [],
                    backgroundColor: colors.electric.main,
                    stack: 'total'
                },
                {
                    label: 'Natural Gas',
                    data: [],
                    backgroundColor: colors.gas.main,
                    stack: 'total'
                }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
                        afterBody: (items) => {
                            const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
                            return `Total: $${total.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                x: {
                    ...commonOptions.scales.x,
                    stacked: true
                },
                y: {
                    ...commonOptions.scales.y,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Cost ($)'
                    }
                }
            }
        }
    });
}

/**
 * Update all charts with bill data
 * @param {Array} bills - Array of extracted bill data, sorted by date
 */
export function updateCharts(bills) {
    // Sort bills by statement date
    const sortedBills = [...bills].sort((a, b) => {
        if (!a.statementDate || !b.statementDate) return 0;
        return a.statementDate - b.statementDate;
    });

    // Generate labels
    const labels = sortedBills.map(bill => formatDateShort(bill.statementDate));

    // Electricity Usage
    electricityUsageChart.data.labels = labels;
    electricityUsageChart.data.datasets[0].data = sortedBills.map(b => b.electricity.usage);
    electricityUsageChart.update();

    // Gas Usage
    gasUsageChart.data.labels = labels;
    gasUsageChart.data.datasets[0].data = sortedBills.map(b => b.gas.usageTherms);
    gasUsageChart.update();

    // Electricity Rates
    electricityRatesChart.data.labels = labels;
    electricityRatesChart.data.datasets[0].data = sortedBills.map(b => b.electricity.supplyRate);
    electricityRatesChart.data.datasets[1].data = sortedBills.map(b => b.electricity.deliveryRate);
    electricityRatesChart.update();

    // Gas Rates
    gasRatesChart.data.labels = labels;
    gasRatesChart.data.datasets[0].data = sortedBills.map(b => b.gas.supplyRate);
    gasRatesChart.data.datasets[1].data = sortedBills.map(b => b.gas.deliveryRate);
    gasRatesChart.update();

    // Total Cost
    totalCostChart.data.labels = labels;
    totalCostChart.data.datasets[0].data = sortedBills.map(b => b.electricity.totalCost);
    totalCostChart.data.datasets[1].data = sortedBills.map(b => b.gas.totalCost);
    totalCostChart.update();
}

/**
 * Clear all chart data
 */
export function clearCharts() {
    const charts = [electricityUsageChart, gasUsageChart, electricityRatesChart, gasRatesChart, totalCostChart];

    for (const chart of charts) {
        chart.data.labels = [];
        for (const dataset of chart.data.datasets) {
            dataset.data = [];
        }
        chart.update();
    }
}

/**
 * Highlight a specific data point index across all charts
 * @param {number|null} index - The index to highlight, or null to clear
 */
export function highlightDataPoint(index) {
    const charts = [electricityUsageChart, gasUsageChart, electricityRatesChart, gasRatesChart, totalCostChart];

    for (const chart of charts) {
        if (index !== null && chart.data.datasets.length > 0) {
            // Create active elements for ALL datasets in the chart
            const activeElements = chart.data.datasets.map((_, datasetIndex) => ({
                datasetIndex,
                index
            }));

            chart.setActiveElements(activeElements);
            chart.tooltip.setActiveElements(activeElements, { x: 0, y: 0 });
        } else {
            chart.setActiveElements([]);
            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
        }
        chart.update('none');
    }
}

/**
 * Get all chart instances for external event handling
 */
export function getCharts() {
    return [electricityUsageChart, gasUsageChart, electricityRatesChart, gasRatesChart, totalCostChart];
}

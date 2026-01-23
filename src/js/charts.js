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
let temperatureChart = null;
let dailyAveragesChart = null;
let usageVsTempChart = null;
let electricCostBreakdownChart = null;
let gasCostBreakdownChart = null;
let costRatioChart = null;
let effectiveRatesChart = null;

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
                pointStyle: 'circle',
                padding: 20,
                font: {
                    size: 13,
                    weight: '500'
                },
                boxWidth: 8,
                boxHeight: 8
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
                size: 13,
                weight: '600'
            },
            bodyFont: {
                size: 12
            },
            padding: 10,
            cornerRadius: 6
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                font: {
                    size: 11
                }
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: '#e2e8f0'
            },
            ticks: {
                font: {
                    size: 11
                }
            }
        }
    }
};

// Color palette - NYSEG brand colors
// Blue = wind/water (electricity), Orange = gas/sun, Green = leaf/environment
const colors = {
    electric: {
        main: 'rgb(96, 165, 250)',        // NYSEG Blue
        light: 'rgba(96, 165, 250, 0.15)',
        supply: 'rgb(59, 130, 246)',      // Darker blue
        delivery: 'rgb(147, 197, 253)'    // Light blue
    },
    gas: {
        main: 'rgb(251, 146, 60)',        // NYSEG Orange
        light: 'rgba(251, 146, 60, 0.15)',
        supply: 'rgb(234, 88, 12)',       // Darker orange
        delivery: 'rgb(253, 186, 116)'    // Light orange
    },
    temperature: {
        main: 'rgb(248, 113, 113)',       // Warm red
        light: 'rgba(248, 113, 113, 0.15)'
    },
    taxes: {
        main: 'rgb(74, 222, 128)',        // NYSEG Green
        light: 'rgba(74, 222, 128, 0.5)'
    },
    misc: {
        main: 'rgb(148, 163, 184)',       // Slate gray
        light: 'rgba(148, 163, 184, 0.5)'
    },
    cost: {
        main: 'rgb(74, 222, 128)',        // NYSEG Green
        light: 'rgba(74, 222, 128, 0.15)'
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

    // Temperature Chart
    const tempCtx = document.getElementById('temperature-chart').getContext('2d');
    temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Avg Daily Temp',
                data: [],
                borderColor: colors.temperature.main,
                backgroundColor: colors.temperature.light,
                pointBackgroundColor: colors.temperature.main,
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
                        label: (ctx) => `${ctx.parsed.y}°F`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: '°F'
                    }
                }
            }
        }
    });

    // Daily Averages Chart ($/day)
    const dailyAvgCtx = document.getElementById('daily-averages-chart').getContext('2d');
    dailyAveragesChart = new Chart(dailyAvgCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '$/day',
                    data: [],
                    borderColor: colors.cost.main,
                    backgroundColor: colors.cost.light,
                    pointBackgroundColor: colors.cost.main,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6
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
                        label: (ctx) => `$${ctx.parsed.y.toFixed(2)}/day`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: '$/day'
                    }
                }
            }
        }
    });

    // Usage vs Temperature Chart (dual axis)
    const usageTempCtx = document.getElementById('usage-vs-temp-chart').getContext('2d');
    usageVsTempChart = new Chart(usageTempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'kWh/day',
                    data: [],
                    borderColor: colors.electric.main,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.electric.main,
                    tension: 0.3,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Therms/day',
                    data: [],
                    borderColor: colors.gas.main,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.gas.main,
                    tension: 0.3,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Temp (°F)',
                    data: [],
                    borderColor: colors.temperature.main,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.temperature.main,
                    tension: 0.3,
                    pointRadius: 4,
                    borderDash: [5, 5],
                    yAxisID: 'y1'
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
                        label: (ctx) => {
                            if (ctx.dataset.label === 'Avg Temp (°F)') {
                                return `${ctx.parsed.y}°F`;
                            } else if (ctx.dataset.label === 'kWh/day') {
                                return `${ctx.parsed.y.toFixed(1)} kWh/day`;
                            } else {
                                return `${ctx.parsed.y.toFixed(2)} therms/day`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Usage/day'
                    },
                    grid: { color: '#e2e8f0' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '°F'
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });

    // Electric Cost Breakdown Chart
    const elecBreakdownCtx = document.getElementById('electric-cost-breakdown-chart').getContext('2d');
    electricCostBreakdownChart = new Chart(elecBreakdownCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Delivery',
                    data: [],
                    backgroundColor: colors.electric.delivery,
                    stack: 'stack'
                },
                {
                    label: 'Supply',
                    data: [],
                    backgroundColor: colors.electric.supply,
                    stack: 'stack'
                },
                {
                    label: 'Taxes',
                    data: [],
                    backgroundColor: colors.taxes.main,
                    stack: 'stack'
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
                x: { ...commonOptions.scales.x, stacked: true },
                y: {
                    ...commonOptions.scales.y,
                    stacked: true,
                    title: { display: true, text: '$' }
                }
            }
        }
    });

    // Gas Cost Breakdown Chart
    const gasBreakdownCtx = document.getElementById('gas-cost-breakdown-chart').getContext('2d');
    gasCostBreakdownChart = new Chart(gasBreakdownCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Delivery',
                    data: [],
                    backgroundColor: colors.gas.delivery,
                    stack: 'stack'
                },
                {
                    label: 'Supply',
                    data: [],
                    backgroundColor: colors.gas.supply,
                    stack: 'stack'
                },
                {
                    label: 'Taxes',
                    data: [],
                    backgroundColor: colors.taxes.main,
                    stack: 'stack'
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
                x: { ...commonOptions.scales.x, stacked: true },
                y: {
                    ...commonOptions.scales.y,
                    stacked: true,
                    title: { display: true, text: '$' }
                }
            }
        }
    });

    // Cost Ratio Chart (Electric vs Gas %)
    const costRatioCtx = document.getElementById('cost-ratio-chart').getContext('2d');
    costRatioChart = new Chart(costRatioCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Electricity %',
                    data: [],
                    backgroundColor: colors.electric.main,
                    stack: 'stack'
                },
                {
                    label: 'Natural Gas %',
                    data: [],
                    backgroundColor: colors.gas.main,
                    stack: 'stack'
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
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                x: { ...commonOptions.scales.x, stacked: true },
                y: {
                    ...commonOptions.scales.y,
                    stacked: true,
                    max: 100,
                    title: { display: true, text: '%' }
                }
            }
        }
    });

    // Effective Rates Chart (all-in cost per unit)
    const effectiveRatesCtx = document.getElementById('effective-rates-chart').getContext('2d');
    effectiveRatesChart = new Chart(effectiveRatesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Electric ($/kWh)',
                    data: [],
                    borderColor: colors.electric.main,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.electric.main,
                    tension: 0.3,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Gas ($/therm)',
                    data: [],
                    borderColor: colors.gas.main,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: colors.gas.main,
                    tension: 0.3,
                    pointRadius: 4,
                    yAxisID: 'y1'
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
                        label: (ctx) => {
                            if (ctx.dataset.label.includes('Electric')) {
                                return `Electric: $${ctx.parsed.y.toFixed(4)}/kWh`;
                            } else {
                                return `Gas: $${ctx.parsed.y.toFixed(4)}/therm`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: { display: true, text: '$/kWh' },
                    grid: { color: '#e2e8f0' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: '$/therm' },
                    grid: { drawOnChartArea: false }
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

    // Temperature
    temperatureChart.data.labels = labels;
    temperatureChart.data.datasets[0].data = sortedBills.map(b => b.averageDailyTemp);
    temperatureChart.update();

    // Daily Averages ($/day)
    dailyAveragesChart.data.labels = labels;
    dailyAveragesChart.data.datasets[0].data = sortedBills.map(b =>
        b.servicePeriod.days > 0 ? b.totalEnergyCharges / b.servicePeriod.days : 0
    );
    dailyAveragesChart.update();

    // Usage vs Temperature
    usageVsTempChart.data.labels = labels;
    usageVsTempChart.data.datasets[0].data = sortedBills.map(b =>
        b.servicePeriod.days > 0 ? b.electricity.usage / b.servicePeriod.days : 0
    );
    usageVsTempChart.data.datasets[1].data = sortedBills.map(b =>
        b.servicePeriod.days > 0 ? b.gas.usageTherms / b.servicePeriod.days : 0
    );
    usageVsTempChart.data.datasets[2].data = sortedBills.map(b => b.averageDailyTemp);
    usageVsTempChart.update();

    // Electric Cost Breakdown
    electricCostBreakdownChart.data.labels = labels;
    electricCostBreakdownChart.data.datasets[0].data = sortedBills.map(b => b.electricity.totalDelivery);
    electricCostBreakdownChart.data.datasets[1].data = sortedBills.map(b => b.electricity.totalSupply);
    electricCostBreakdownChart.data.datasets[2].data = sortedBills.map(b => b.electricity.totalTaxes);
    electricCostBreakdownChart.update();

    // Gas Cost Breakdown
    gasCostBreakdownChart.data.labels = labels;
    gasCostBreakdownChart.data.datasets[0].data = sortedBills.map(b => b.gas.totalDelivery);
    gasCostBreakdownChart.data.datasets[1].data = sortedBills.map(b => b.gas.totalSupply);
    gasCostBreakdownChart.data.datasets[2].data = sortedBills.map(b => b.gas.totalTaxes);
    gasCostBreakdownChart.update();

    // Cost Ratio (Electric vs Gas %)
    costRatioChart.data.labels = labels;
    costRatioChart.data.datasets[0].data = sortedBills.map(b => {
        const total = b.electricity.totalCost + b.gas.totalCost;
        return total > 0 ? (b.electricity.totalCost / total) * 100 : 0;
    });
    costRatioChart.data.datasets[1].data = sortedBills.map(b => {
        const total = b.electricity.totalCost + b.gas.totalCost;
        return total > 0 ? (b.gas.totalCost / total) * 100 : 0;
    });
    costRatioChart.update();

    // Effective Rates (all-in $/unit)
    effectiveRatesChart.data.labels = labels;
    effectiveRatesChart.data.datasets[0].data = sortedBills.map(b =>
        b.electricity.usage > 0 ? b.electricity.totalCost / b.electricity.usage : 0
    );
    effectiveRatesChart.data.datasets[1].data = sortedBills.map(b =>
        b.gas.usageTherms > 0 ? b.gas.totalCost / b.gas.usageTherms : 0
    );
    effectiveRatesChart.update();
}

/**
 * Clear all chart data
 */
export function clearCharts() {
    const charts = getAllCharts();

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
    const charts = getAllCharts();

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
 * Get all chart instances
 */
function getAllCharts() {
    return [
        electricityUsageChart,
        gasUsageChart,
        electricityRatesChart,
        gasRatesChart,
        totalCostChart,
        temperatureChart,
        dailyAveragesChart,
        usageVsTempChart,
        electricCostBreakdownChart,
        gasCostBreakdownChart,
        costRatioChart,
        effectiveRatesChart
    ];
}

/**
 * Get all chart instances for external event handling
 */
export function getCharts() {
    return getAllCharts();
}

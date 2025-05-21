// Chart instances
let netWorthLineChart = null;
let finalAssetPieChartInstance = null;

// Helper to format numbers as Indian Rupees
const formatRupee = (num) => {
    if (isNaN(num)) return '₹ 0';
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    return formatter.format(num);
};

// Helper to parse float from input, defaulting to 0 if invalid
const getFloat = (id) => parseFloat(document.getElementById(id).value) || 0;

// Page switching logic
const inputPage = document.getElementById('inputPage');
const resultsPage = document.getElementById('resultsPage');
const chartPage = document.getElementById('chartPage'); // New chart page
const calculateButton = document.getElementById('calculateButton');
const backToInputsButton = document.getElementById('backToInputsButton');
const viewChartPageButton = document.getElementById('viewChartPageButton'); // New button
const backToResultsButton = document.getElementById('backToResultsButton'); // New button

const getStartedButton = document.getElementById('getStartedButton');
const formSection = document.getElementById('formSection');
const mainTitleSection = document.querySelector('#inputPage .md\\:col-span-5'); // Adjust selector if HTML structure changes

if (getStartedButton && formSection && mainTitleSection) {
    getStartedButton.addEventListener('click', () => {
        mainTitleSection.classList.add('hidden'); // Hide the title/intro
        formSection.classList.remove('hidden'); // Show the form
        formSection.classList.add('md:col-span-12'); // Make form take full width available in the grid
        // Optionally, scroll to the form or adjust layout further
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

calculateButton.addEventListener('click', () => {
    // First, switch views
    inputPage.style.display = 'none';
    resultsPage.style.display = 'flex'; // Use flex for centering content if needed
    resultsPage.classList.add('flex-col'); // Ensure vertical layout
    chartPage.style.display = 'none';
    
    // Scroll to top of results page
    window.scrollTo(0, 0);

    // --- Get Initial Holdings ---
    const initial = {
        cash: getFloat('initialCash'),
        ppf: getFloat('initialPPF'),
        equityMF: getFloat('initialEquityMF'),
        usStocks: getFloat('initialUSStocks'),
        indianStocks: getFloat('initialIndianStocks'),
        gold: getFloat('initialGold'),
        nps: getFloat('initialNPS'),
        pf: getFloat('initialPF'),
    };

    // --- Get Investment Parameters ---
    const pfMonthlyInvestment = getFloat('pfMonthlyInvestment');
    let pfAnnualInvestment = pfMonthlyInvestment * 12;
    const pfStepUp = getFloat('pfStepUp') / 100;
    
    const npsAnnualInvestment = getFloat('npsAnnualInvestment');
    
    let splitMonthlyTotal = getFloat('splitMonthlyTotal');
    let splitAnnualTotal = splitMonthlyTotal * 12;
    const splitEquityMFProportion = getFloat('splitEquityMFProportion') / 100;
    const splitIndianStocksProportion = getFloat('splitIndianStocksProportion') / 100;
    const splitUSStocksProportion = getFloat('splitUSStocksProportion') / 100;
    const splitGoldProportion = getFloat('splitGoldProportion') / 100;
    const splitStepUp = getFloat('splitStepUp') / 100;

    // Validate split proportions
    const totalSplitProportion = splitEquityMFProportion + splitIndianStocksProportion + splitUSStocksProportion + splitGoldProportion;
    if (Math.abs(totalSplitProportion - 1.0) > 0.01) { // Allow for small floating point inaccuracies
            alert(`Split portfolio proportions must add up to 100%. Current sum: ${(totalSplitProportion * 100).toFixed(2)}%`);
            return;
    }


    // --- Get Growth Rates & Period ---
    const ppfRate = getFloat('ppfRate') / 100;
    const pfRate = getFloat('pfRate') / 100;
    const npsRate = getFloat('npsRate') / 100;
    const primaryCAGR = getFloat('primaryCAGR') / 100;
    const projectionYears = parseInt(document.getElementById('projectionYears').value) || 0;

    const cagrScenarios = [primaryCAGR - 0.01, primaryCAGR, primaryCAGR + 0.01]; // Low, Primary, High

    // --- Initialize for Calculation ---
    let yearlyResults = [];
    let cumulativeInvestments = 0;
    
    let currentPFAnnualInv = pfAnnualInvestment;
    let currentSplitAnnualTotal = splitAnnualTotal;

    // Arrays to hold asset values for each CAGR scenario
    let currentAssets = cagrScenarios.map(() => ({ ...initial }));
    
    const initialTotalNetWorth = Object.values(initial).reduce((sum, val) => sum + val, 0);
    let startingNetWorthForYear = initialTotalNetWorth;

    // --- Calculation Loop ---
    for (let year = 1; year <= projectionYears; year++) {
        let newInvestmentsThisYear = 0;

        if (year > 1) {
            currentPFAnnualInv *= (1 + pfStepUp);
            currentSplitAnnualTotal *= (1 + splitStepUp);
        }
        
        const newSplitEquityMFInv = currentSplitAnnualTotal * splitEquityMFProportion;
        const newSplitIndianStocksInv = currentSplitAnnualTotal * splitIndianStocksProportion;
        const newSplitUSStocksInv = currentSplitAnnualTotal * splitUSStocksProportion;
        const newSplitGoldInv = currentSplitAnnualTotal * splitGoldProportion;

        newInvestmentsThisYear = currentPFAnnualInv + npsAnnualInvestment + currentSplitAnnualTotal;
        cumulativeInvestments += newInvestmentsThisYear;

        let endNetWorthScenarios = [];

        for (let i = 0; i < cagrScenarios.length; i++) {
            let assets = currentAssets[i];
            const cagr = cagrScenarios[i];

            // Add new investments
            assets.pf += currentPFAnnualInv;
            assets.nps += npsAnnualInvestment;
            assets.equityMF += newSplitEquityMFInv;
            assets.indianStocks += newSplitIndianStocksInv;
            assets.usStocks += newSplitUSStocksInv;
            assets.gold += newSplitGoldInv;
            // PPF has no new investments in this model based on user's problem statement

            // Apply growth
            assets.pf *= (1 + pfRate);
            assets.nps *= (1 + npsRate);
            assets.ppf *= (1 + ppfRate);
            assets.equityMF *= (1 + cagr);
            assets.indianStocks *= (1 + cagr);
            assets.usStocks *= (1 + cagr);
            assets.gold *= (1 + cagr);
            // Cash remains constant

            const totalNetWorthScenario = Object.values(assets).reduce((sum, val) => sum + val, 0);
            endNetWorthScenarios.push(totalNetWorthScenario);
        }
        
        yearlyResults.push({
            year: year,
            startingNetWorth: startingNetWorthForYear,
            newInvestments: newInvestmentsThisYear,
            cumulativeInvestments: cumulativeInvestments,
            endNetWorthLow: endNetWorthScenarios[0],
            endNetWorthPrimary: endNetWorthScenarios[1],
            endNetWorthHigh: endNetWorthScenarios[2],
            // Store detailed asset breakdown for primary CAGR for the final year
            finalAssetsPrimaryCAGR: year === projectionYears ? { ...currentAssets[1] } : null 
        });
        
        // For the next year's starting net worth, use the primary CAGR's end net worth
        startingNetWorthForYear = endNetWorthScenarios[1]; 
    }

    // --- Display Results ---
    displayResultsTable(yearlyResults, cagrScenarios);
    displayNetWorthChart(yearlyResults);
    if (projectionYears > 0) {
        displayFinalAssetBreakdown(yearlyResults[yearlyResults.length - 1].finalAssetsPrimaryCAGR);
    } else {
            document.getElementById('finalAssetBreakdown').innerHTML = '<p class="text-gray-500">Not enough data for final breakdown.</p>';
            if(finalAssetPieChartInstance) finalAssetPieChartInstance.destroy();
    }
});

backToInputsButton.addEventListener('click', () => {
    resultsPage.style.display = 'none';
    chartPage.style.display = 'none';
    inputPage.style.display = 'flex'; // Show input page
    if (mainTitleSection && formSection) {
        mainTitleSection.classList.remove('hidden'); // Show title
        formSection.classList.add('hidden'); // Hide form
        formSection.classList.remove('md:col-span-12'); // Reset form width
    }
    // Scroll to top of input page
    window.scrollTo(0, 0);
});

viewChartPageButton.addEventListener('click', () => {
    resultsPage.style.display = 'none';
    chartPage.style.display = 'flex'; // Use flex
    chartPage.classList.add('flex-col');
    window.scrollTo(0,0); // Scroll to top of chart page
    // Ensure chart is rendered if not already (it should be by calculateButton click)
    // If needed, you could call displayNetWorthChart(yearlyResults) here again,
    // but it's better to ensure yearlyResults is globally accessible or passed appropriately.
});

backToResultsButton.addEventListener('click', () => {
    chartPage.style.display = 'none';
    resultsPage.style.display = 'flex'; // Use flex
    resultsPage.classList.add('flex-col');
    window.scrollTo(0,0); // Scroll to top of results page
});

function displayResultsTable(results, cagrs) {
    const tableContainer = document.getElementById('resultsSummary');
    let tableHTML = `<div class="overflow-x-auto"><table class="min-w-full bg-transparent results-table">
                        <thead class="bg-slate-700/50 sticky top-0 z-10">
                            <tr>
                                <th>Year</th>
                                <th>Start NW (Primary)</th>
                                <th>New Investments</th>
                                <th>End NW (${(cagrs[0]*100).toFixed(1)}%)</th>
                                <th>End NW (${(cagrs[1]*100).toFixed(1)}%)</th>
                                <th>End NW (${(cagrs[2]*100).toFixed(1)}%)</th>
                            </tr>
                        </thead><tbody>`;
    results.forEach(res => {
        tableHTML += `<tr>
                        <td>${res.year}</td>
                        <td>${formatRupee(res.startingNetWorth)}</td>
                        <td>${formatRupee(res.newInvestments)}</td>
                        <td>${formatRupee(res.endNetWorthLow)}</td>
                        <td>${formatRupee(res.endNetWorthPrimary)}</td>
                        <td>${formatRupee(res.endNetWorthHigh)}</td>
                        </tr>`;
    });
    tableHTML += `</tbody></table></div>`;
    tableContainer.innerHTML = tableHTML;
}

function displayNetWorthChart(results) {
    const ctx = document.getElementById('netWorthChart').getContext('2d');
    const labels = results.map(r => `Year ${r.year}`);
    const netWorthData = results.map(r => r.endNetWorthPrimary);
    const cumulativeInvestmentData = results.map(r => r.cumulativeInvestments);

    // Chart.js global defaults for dark theme
    Chart.defaults.color = '#94A3B8'; // Light grey for text
    Chart.defaults.borderColor = '#334155'; // Darker lines for axes

    if (netWorthLineChart) {
        netWorthLineChart.destroy();
    }
    netWorthLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Projected Net Worth (Primary CAGR)',
                    data: netWorthData,
                    borderColor: '#2DD4BF', // Teal
                    backgroundColor: 'rgba(45, 212, 191, 0.2)',
                    tension: 0, // Performance: Straight lines are less computationally intensive
                    fill: true,
                    pointBackgroundColor: '#2DD4BF',
                    pointBorderColor: '#fff',
                    pointRadius: 0, // Performance: Don't render points by default for large datasets
                    pointHitRadius: 10 // Performance: Allow tooltips to trigger when hovering near the line
                },
                {
                    label: 'Cumulative Investments',
                    data: cumulativeInvestmentData,
                    borderColor: '#F472B6', // Pink
                    backgroundColor: 'rgba(244, 114, 182, 0.1)',
                    tension: 0, // Performance: Straight lines are less computationally intensive
                    fill: false,
                    pointBackgroundColor: '#F472B6',
                    pointBorderColor: '#fff',
                    pointRadius: 0, // Performance: Don't render points by default for large datasets
                    pointHitRadius: 10 // Performance: Allow tooltips to trigger when hovering near the line
                }
            ]
        },
        options: {
            animation: false, // Performance: Disable animations for faster rendering with large datasets
            responsive: true,
            maintainAspectRatio: false, // Crucial for the canvas to fill the container
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatRupee(value),
                        color: '#94A3B8' // Y-axis ticks color
                    },
                    grid: {
                        color: '#334155' // Y-axis grid lines color
                    }
                },
                x: {
                    ticks: {
                        color: '#94A3B8' // X-axis ticks color
                    },
                    grid: {
                        color: '#334155' // X-axis grid lines color
                    }
                }
            },
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy', // Enable panning on both x and y axes
                        threshold: 10, // Increase threshold for panning to start
                    },
                    zoom: {
                        wheel: {
                            enabled: true, // Enable zooming with mouse wheel
                            speed: 0.05, // Reduce zoom speed (default is 0.1)
                        },
                        pinch: {
                            enabled: true, // Enable zooming with pinch gesture
                            // sensitivity: 0.5 // Example: if a sensitivity option existed
                        },
                        mode: 'xy', // Enable zooming on both x and y axes
                        drag: {
                            enabled: true, // Enable zooming by dragging
                            backgroundColor: 'rgba(75,192,192,0.2)', // Slightly more transparent
                            modifierKey: 'shift', // Require shift for drag-to-zoom to avoid conflict with panning
                        }
                    }
                },
                legend: {
                    labels: {
                        color: '#E2E8F0' // Legend text color
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', // Dark tooltip
                    titleColor: '#E2E8F0',
                    bodyColor: '#CBD5E1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatRupee(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function displayFinalAssetBreakdown(finalAssets) {
    const breakdownContainer = document.getElementById('finalAssetBreakdown');
    if (!finalAssets) {
        breakdownContainer.innerHTML = '<p class="text-slate-400">No data for final breakdown.</p>';
        if(finalAssetPieChartInstance) finalAssetPieChartInstance.destroy();
        return;
    }

    let breakdownHTML = `<div class="overflow-x-auto"><table class="min-w-full bg-transparent results-table">
                            <thead><tr><th>Asset Class</th><th>Value (₹)</th></tr></thead><tbody>`;
    const assetLabels = [];
    const assetValues = [];
    let totalValue = 0;

    const displayOrder = ['Cash', 'PPF', 'Equity MF', 'Indian Stocks', 'US Stocks', 'Gold', 'NPS', 'PF'];
    const formattedNames = {
        cash: 'Cash', ppf: 'PPF', equityMF: 'Equity MF', indianStocks: 'Indian Stocks', 
        usStocks: 'US Stocks', gold: 'Gold', nps: 'NPS', pf: 'PF'
    };

    for(const key of displayOrder) {
        const assetKey = Object.keys(formattedNames).find(k => formattedNames[k] === key);
            if (finalAssets.hasOwnProperty(assetKey)) {
            const value = finalAssets[assetKey];
            breakdownHTML += `<tr><td>${key}</td><td>${formatRupee(value)}</td></tr>`;
            if (value > 0) { // Only include in pie chart if value > 0
                assetLabels.push(key);
                assetValues.push(value);
            }
            totalValue += value;
        }
    }
    breakdownHTML += `<tr><td class="font-bold">Total Net Worth</td><td class="font-bold">${formatRupee(totalValue)}</td></tr>`;
    breakdownHTML += `</tbody></table></div>`;
    breakdownContainer.innerHTML = breakdownHTML;

    // Display Pie Chart
    const pieCtx = document.getElementById('finalAssetPieChart').getContext('2d');
    if (finalAssetPieChartInstance) {
        finalAssetPieChartInstance.destroy();
    }
    finalAssetPieChartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: assetLabels,
            datasets: [{
                label: 'Asset Allocation',
                data: assetValues,
                backgroundColor: [
                    '#2DD4BF', // Teal
                    '#60A5FA', // Blue
                    '#F472B6', // Pink
                    '#A78BFA', // Purple
                    '#FBBF24', // Amber
                    '#34D399', // Emerald
                    '#9CA3AF', // Gray
                    '#F87171'  // Red
                ],
                borderColor: '#1E293B', // Dark background color for border separation
                hoverOffset: 8,
                hoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#E2E8F0', // Legend text color
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#E2E8F0',
                    bodyColor: '#CBD5E1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += formatRupee(context.parsed);
                                const percentage = (context.parsed / totalValue * 100).toFixed(2);
                                label += ` (${percentage}%)`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

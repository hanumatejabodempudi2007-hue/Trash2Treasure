/**
 * Trash to Treasure – Frontend Application Controller (API Integrations)
 */

// Dynamically determine the API Base URL.
// Allows local filesystem execution (pointing to local port 8000) or host-origin resolution when served by FastAPI.
const API_BASE = window.location.origin === "null" || window.location.protocol === "file:" 
    ? "http://127.0.0.1:8000" 
    : window.location.origin;

// Global Application State
const state = {
    inventoryRaw: [],       // Raw parsed products from API
    analyzedSummary: {},    // Summary audit counters
    analyzedProducts: [],   // Audited products list
    flaggedProducts: [],    // Flagged products enriched with AI copies
    charts: {
        health: null,
        category: null,
        risk: null
    },
    currentTab: "dashboard",
    agentRunning: false
};

// Initialize app when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initFileUpload();
    initDemoLoaders();
    initAgentControls();
    initModalControls();
    initExportButtons();
    initCsvTemplateDownloader();
    
    // Refresh lucide icons
    lucide.createIcons();
});

// ==========================================
// 1. Navigation & Routing
// ==========================================
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");

    const switchTab = (targetView) => {
        // Update navigation active state
        navItems.forEach(item => {
            if (item.getAttribute("data-target") === targetView) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Toggle active sections in main content
        const sections = document.querySelectorAll(".view-section");
        sections.forEach(sec => {
            if (sec.id === `view-${targetView}`) {
                sec.classList.add("active");
            } else {
                sec.classList.remove("active");
            }
        });

        // Update top-bar text
        const titleEl = document.getElementById("page-header-title");
        const descEl = document.getElementById("page-header-desc");
        
        state.currentTab = targetView;

        switch (targetView) {
            case "dashboard":
                titleEl.textContent = "Dashboard Overview";
                descEl.textContent = "Monitor inventory health metrics and run smart marketing campaigns.";
                updateDashboardCharts();
                break;
            case "inventory":
                titleEl.textContent = "Inventory Database";
                descEl.textContent = "Upload your catalog file (CSV/Excel) and manage stock registers.";
                break;
            case "agent-workflow":
                titleEl.textContent = "AI Agent Console";
                descEl.textContent = "Execute deep analysis and competitor intelligence reports.";
                break;
            case "action-center":
                titleEl.textContent = "Strategic Action Center";
                descEl.textContent = "Deploy markdown strategies, bundles, and generate copywriting copies.";
                break;
        }
    };

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const target = item.getAttribute("data-target");
            switchTab(target);
        });
    });

    // Handle quick-link buttons inside views
    document.body.addEventListener("click", (e) => {
        const trigger = e.target.closest(".btn-nav-trigger");
        if (trigger) {
            const navTarget = trigger.getAttribute("data-nav");
            if (navTarget) {
                switchTab(navTarget);
            }
        }
    });
}

// ==========================================
// 2. Data Upload & API File Parsing
// ==========================================
function initFileUpload() {
    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("file-input");

    // Drag events
    ["dragenter", "dragover"].forEach(eventName => {
        uploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadZone.classList.add("dragover");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        uploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadZone.classList.remove("dragover");
        }, false);
    });

    uploadZone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            uploadFileToAPI(files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            uploadFileToAPI(e.target.files[0]);
        }
    });
}

async function uploadFileToAPI(file) {
    // Show visual loading
    const uploadZone = document.getElementById("upload-zone");
    const originalHTML = uploadZone.innerHTML;
    uploadZone.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
            <div style="border: 4px solid rgba(99, 102, 241, 0.1); border-left-color: var(--color-indigo); width: 48px; height: 48px; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h3>Uploading and Parsing Catalog...</h3>
            <p class="upload-subtext">Calculating sales velocity and inventory turnover benchmarks.</p>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed parsing file on server.");
        }

        const data = await response.json();
        setInventoryData(data);

        // Auto route to Dashboard
        const dashboardTab = document.querySelector('.nav-item[data-target="dashboard"]');
        if (dashboardTab) dashboardTab.click();

        alert(`Successfully imported ${data.summary.totalProducts} items and audited stock risks!`);

    } catch (err) {
        console.error(err);
        alert(`Parsing Error: ${err.message}`);
    } finally {
        uploadZone.innerHTML = originalHTML;
        // Re-bind click event since we restored innerHTML
        document.getElementById("file-input").addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                uploadFileToAPI(e.target.files[0]);
            }
        });
    }
}

// Set state and execute baseline calculations
function setInventoryData(apiResponse) {
    state.inventoryRaw = apiResponse.products;
    state.analyzedSummary = apiResponse.summary;
    state.analyzedProducts = apiResponse.products;
    
    // Clear AI results since new data is loaded
    state.flaggedProducts = [];
    updateFlaggedBadgeCount(0);
    
    // UI refreshes
    updateKpiCards();
    updatePriorityItemsTable();
    updateFullInventoryTable();
    updateDashboardCharts();
    
    // Terminal clear / instructions
    const term = document.getElementById("terminal-output");
    term.innerHTML = `
        <div class="log-line log-system">SYSTEM: Loaded ${apiResponse.products.length} products. Metric audit completed on server.</div>
        <div class="log-line log-success">SYSTEM: Flagged ${apiResponse.summary.slowMovingCount + apiResponse.summary.deadStockCount} items at sales velocity risk.</div>
        <div class="log-line log-info">SYSTEM: Click "Initialize Smart Agent Workflow" to run competitor audits and marketing generations.</div>
    `;
    document.getElementById("terminal-step-badge").textContent = "Awaiting AI";
    document.getElementById("agent-progress-fill").style.width = "0%";
    
    resetActionCenterUI();
}

function resetActionCenterUI() {
    const container = document.getElementById("strategy-cards-container");
    if (state.flaggedProducts.length > 0) {
        renderStrategyCards();
    } else {
        container.innerHTML = `
            <div class="empty-state-container">
                <i data-lucide="cpu" class="large-icon"></i>
                <h3>No Active Strategy Recommendations</h3>
                <p class="desc-text">To generate sales strategies, pricing models, and marketing templates, run the AI Agent in the console first.</p>
                <button class="btn btn-primary btn-nav-trigger margin-top-md" data-nav="agent-workflow">
                    Go to AI Agent Console
                </button>
            </div>
        `;
        lucide.createIcons();
    }
}

// ==========================================
// 3. Demo loaders & Reset
// ==========================================
function initDemoLoaders() {
    const loadDemoBtn = document.getElementById("btn-load-demo");
    const resetBtn = document.getElementById("btn-reset");

    loadDemoBtn.addEventListener("click", async () => {
        // Convert DEFAULT_INVENTORY raw array to CSV blob and post to reuse API parser
        const csvContent = window.SAMPLE_CSV_CONTENT;
        const blob = new Blob([csvContent], { type: "text/csv" });
        const file = new File([blob], "demo_catalog.csv", { type: "text/csv" });
        await uploadFileToAPI(file);
    });

    resetBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all loaded inventory data?")) {
            state.inventoryRaw = [];
            state.analyzedSummary = {};
            state.analyzedProducts = [];
            state.flaggedProducts = [];
            updateFlaggedBadgeCount(0);

            // Reset UI counters
            document.getElementById("kpi-total-products").textContent = "0";
            document.getElementById("kpi-total-value").textContent = "$0.00";
            document.getElementById("kpi-healthy").textContent = "0";
            document.getElementById("kpi-slow-moving").textContent = "0";
            document.getElementById("kpi-dead-stock").textContent = "0";

            // Reset Tables
            document.getElementById("dashboard-priority-table").querySelector("tbody").innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">No inventory data loaded. Click "Load Demo Data" or go to the "Inventory Database" page to upload a file.</td>
                </tr>
            `;
            document.getElementById("inventory-table").querySelector("tbody").innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">No inventory items. Use the drag & drop zone above to upload data or click "Load Demo Data".</td>
                </tr>
            `;
            document.getElementById("inventory-count-text").textContent = "0 items registered";

            // Reset Charts
            if (state.charts.health) { state.charts.health.destroy(); state.charts.health = null; }
            if (state.charts.category) { state.charts.category.destroy(); state.charts.category = null; }
            if (state.charts.risk) { state.charts.risk.destroy(); state.charts.risk = null; }

            // Reset Terminal
            document.getElementById("terminal-output").innerHTML = `
                <div class="log-line log-system">SYSTEM: Inventory cleared. Workspace reset.</div>
            `;
            document.getElementById("terminal-step-badge").textContent = "Idle";
            document.getElementById("agent-progress-fill").style.width = "0%";

            resetActionCenterUI();
            
            alert("Workspace cleared successfully.");
        }
    });
}

function initCsvTemplateDownloader() {
    const csvBtn = document.getElementById("btn-download-csv");
    csvBtn.addEventListener("click", () => {
        const csvContent = window.SAMPLE_CSV_CONTENT;
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "sample_inventory_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// ==========================================
// 4. KPI Counters and Tables Populator
// ==========================================
function updateKpiCards() {
    const sum = state.analyzedSummary;
    document.getElementById("kpi-total-products").textContent = sum.totalProducts;
    document.getElementById("kpi-total-value").textContent = `$${sum.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("kpi-healthy").textContent = sum.fastMovingCount;
    document.getElementById("kpi-slow-moving").textContent = sum.slowMovingCount;
    document.getElementById("kpi-dead-stock").textContent = sum.deadStockCount;
}

function updatePriorityItemsTable() {
    const tbody = document.getElementById("dashboard-priority-table").querySelector("tbody");
    const riskItems = state.analyzedProducts.filter(p => p.classification !== "Fast-Moving");
    
    if (riskItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-green font-semibold">🎉 Outstanding! No slow-moving or dead stock identified. All items are performing.</td>
            </tr>
        `;
        return;
    }

    const sorted = [...riskItems].sort((a,b) => b.inventoryValue - a.inventoryValue).slice(0, 5);

    tbody.innerHTML = "";
    sorted.forEach(p => {
        const riskClass = p.riskScore >= 75 ? "badge-danger" : "badge-warning";
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>${p.quantity}</td>
                <td>$${p.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td>${p.dailyVelocity} / day</td>
                <td><span class="badge ${riskClass}">${p.riskScore}/100</span></td>
                <td><span class="badge ${p.classification === 'Dead Stock' ? 'badge-danger' : 'badge-warning'}">${p.classification}</span></td>
            </tr>
        `;
    });
}

function updateFullInventoryTable() {
    const tbody = document.getElementById("inventory-table").querySelector("tbody");
    const searchVal = document.getElementById("inventory-search").value.toLowerCase();
    
    let filtered = state.analyzedProducts;
    if (searchVal) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchVal) || 
            p.sku.toLowerCase().includes(searchVal) || 
            p.category.toLowerCase().includes(searchVal)
        );
    }

    document.getElementById("inventory-count-text").textContent = `${filtered.length} items registered`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">No items matching criteria.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    filtered.forEach(p => {
        let badgeClass = "badge-success";
        if (p.classification === "Dead Stock") badgeClass = "badge-danger";
        else if (p.classification === "Slow-Moving") badgeClass = "badge-warning";

        tbody.innerHTML += `
            <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>${p.quantity}</td>
                <td>$${p.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td>${p.sold30} / ${p.sold90}</td>
                <td><span class="font-semibold" style="color: ${p.riskScore >= 75 ? 'var(--color-red)' : p.riskScore >= 35 ? 'var(--color-yellow)' : 'var(--color-green)'}">${p.riskScore}/100</span></td>
                <td><span class="badge ${badgeClass}">${p.classification}</span></td>
            </tr>
        `;
    });
}

function updateFlaggedBadgeCount(count) {
    const badge = document.getElementById("flagged-count-badge");
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

// ==========================================
// 5. Chart.js Configurations
// ==========================================
function updateDashboardCharts() {
    if (state.analyzedProducts.length === 0) return;

    const sum = state.analyzedSummary;

    // A. Chart 1: Health Breakdown Pie Chart
    const ctxPie = document.getElementById("chart-health-pie").getContext("2d");
    if (state.charts.health) state.charts.health.destroy();
    
    state.charts.health = new Chart(ctxPie, {
        type: "doughnut",
        data: {
            labels: ["Healthy", "Slow-Moving", "Dead Stock"],
            datasets: [{
                data: [sum.fastMovingCount, sum.slowMovingCount, sum.deadStockCount],
                backgroundColor: ["#10b981", "#f59e0b", "#f43f5e"],
                borderColor: "#0b111e",
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#94a3b8", font: { family: "Plus Jakarta Sans", size: 11 } }
                }
            },
            cutout: "70%"
        }
    });

    // B. Chart 2: Category Sizing Stacked Bar Chart
    const categories = [...new Set(state.analyzedProducts.map(p => p.category))];
    const stockData = [];
    const salesData = [];

    categories.forEach(cat => {
        const catProds = state.analyzedProducts.filter(p => p.category === cat);
        const totalStock = catProds.reduce((acc, p) => acc + p.quantity, 0);
        const totalSales90 = catProds.reduce((acc, p) => acc + p.sold90, 0);
        
        stockData.push(totalStock);
        salesData.push(totalSales90);
    });

    const ctxBar = document.getElementById("chart-category-bar").getContext("2d");
    if (state.charts.category) state.charts.category.destroy();

    state.charts.category = new Chart(ctxBar, {
        type: "bar",
        data: {
            labels: categories,
            datasets: [
                {
                    label: "Stock Quantity",
                    data: stockData,
                    backgroundColor: "rgba(99, 102, 241, 0.7)",
                    borderColor: "#6366f1",
                    borderWidth: 1
                },
                {
                    label: "90-Day Units Sold",
                    data: salesData,
                    backgroundColor: "rgba(6, 182, 212, 0.7)",
                    borderColor: "#06b6d4",
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#94a3b8" } },
                y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#94a3b8" } }
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#94a3b8", font: { family: "Plus Jakarta Sans", size: 11 } }
                }
            }
        }
    });

    // C. Chart 3: Risk Score Distribution
    const buckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
    state.analyzedProducts.forEach(p => {
        const score = p.riskScore;
        if (score <= 20) buckets[0]++;
        else if (score <= 40) buckets[1]++;
        else if (score <= 60) buckets[2]++;
        else if (score <= 80) buckets[3]++;
        else buckets[4]++;
    });

    const ctxRisk = document.getElementById("chart-risk-distribution").getContext("2d");
    if (state.charts.risk) state.charts.risk.destroy();

    state.charts.risk = new Chart(ctxRisk, {
        type: "bar",
        data: {
            labels: ["0-20 (Healthy)", "21-40", "41-60 (Slow)", "61-80", "81-100 (Dead)"],
            datasets: [{
                label: "Number of Products",
                data: buckets,
                backgroundColor: [
                    "rgba(16, 185, 129, 0.6)",
                    "rgba(14, 165, 233, 0.6)",
                    "rgba(245, 158, 11, 0.6)",
                    "rgba(249, 115, 22, 0.6)",
                    "rgba(244, 63, 94, 0.6)"
                ],
                borderColor: [
                    "#10b981", "#0ea5e9", "#f59e0b", "#f97316", "#f43f5e"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
                y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#94a3b8" }, beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ==========================================
// 6. AI Agent Console API Communications
// ==========================================
function initAgentControls() {
    const runBtn = document.getElementById("btn-run-agent");
    const terminal = document.getElementById("terminal-output");
    const stepBadge = document.getElementById("terminal-step-badge");
    const progressFill = document.getElementById("agent-progress-fill");
    const pulseDot = document.getElementById("agent-active-pulse");
    const agentBadge = document.getElementById("agent-status-badge");

    runBtn.addEventListener("click", async () => {
        if (state.inventoryRaw.length === 0) {
            alert("No inventory data loaded. Please upload a spreadsheet or click 'Load Demo Data' first.");
            return;
        }

        if (state.agentRunning) return;

        state.agentRunning = true;
        runBtn.disabled = true;
        pulseDot.classList.remove("hidden");
        
        agentBadge.innerHTML = `
            <span class="status-indicator status-running"></span>
            <span class="status-text">AI Agent Running...</span>
        `;
        terminal.innerHTML = `<div class="log-line log-system">SYSTEM: Directing audit to Python backend...</div>`;
        stepBadge.textContent = "Connecting";
        progressFill.style.width = "5%";

        try {
            const discountMode = document.getElementById("agent-discount-mode").value;
            const persona = document.getElementById("agent-persona").value;

            // Call FastAPI Agent Endpoint
            const response = await fetch(`${API_BASE}/api/analyze-agent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    products: state.analyzedProducts,
                    discount_mode: discountMode,
                    persona: persona
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Agent workflow execution failed.");
            }

            const data = await response.json(); // { logs: [], products: [] }
            
            // Animate logs on screen sequentially to maintain UI typewriter effects
            await animateAgentLogs(
                data.logs, 
                progressFill, 
                terminal, 
                stepBadge, 
                agentBadge, 
                runBtn, 
                pulseDot,
                data.products
            );

        } catch (err) {
            console.error(err);
            const errLine = document.createElement("div");
            errLine.className = "log-line log-danger";
            errLine.textContent = `❌ SYSTEM ERROR: ${err.message}`;
            terminal.appendChild(errLine);
            stepBadge.textContent = "Failed";
            agentBadge.innerHTML = `
                <span class="status-indicator status-idle"></span>
                <span class="status-text">AI Agent Failed</span>
            `;
            state.agentRunning = false;
            runBtn.disabled = false;
            pulseDot.classList.add("hidden");
        }
    });
}

// Helper to sequentially type out incoming log logs from python backend for nice console animations
async function animateAgentLogs(logs, progressFill, terminal, stepBadge, agentBadge, runBtn, pulseDot, finalProducts) {
    terminal.innerHTML = "";
    
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        let logType = "detail";
        
        if (log.startsWith("🤖") || log.startsWith("🎉")) logType = "system";
        else if (log.startsWith("📊") || log.startsWith("💡") || log.startsWith("✍️") || log.startsWith("🌐")) logType = "process";
        else if (log.startsWith("🔎")) logType = "search";
        else if (log.startsWith("✅")) logType = "success";
        else if (log.startsWith("❌")) logType = "danger";
        
        // Extract step badge context
        if (logType === "process") {
            stepBadge.textContent = log.split(":")[0].substring(2).trim();
        }

        const line = document.createElement("div");
        line.className = `log-line log-${logType}`;
        line.textContent = log;
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
        
        const pct = Math.round(((i + 1) / logs.length) * 100);
        progressFill.style.width = `${pct}%`;
        
        // Wait multiplier to look like real-time calculations
        const wait = logType === "process" ? 500 : logType === "search" ? 300 : 150;
        await new Promise(res => setTimeout(res, wait));
    }

    // Complete state updates
    state.flaggedProducts = finalProducts;
    updateFlaggedBadgeCount(finalProducts.length);

    agentBadge.innerHTML = `
        <span class="status-indicator status-done"></span>
        <span class="status-text">AI Agent Completed</span>
    `;
    stepBadge.textContent = "Complete";

    resetActionCenterUI();
    lucide.createIcons();
    
    // Cleanup run flags
    state.agentRunning = false;
    runBtn.disabled = false;
    pulseDot.classList.add("hidden");

    alert(`AI Agent successfully audited items and generated strategies for ${finalProducts.length} flagged products!`);

    // Route to Action Center
    setTimeout(() => {
        const actionTab = document.querySelector('.nav-item[data-target="action-center"]');
        if (actionTab) actionTab.click();
    }, 1200);
}

// ==========================================
// 7. Render Output Strategy Cards (Action Center)
// ==========================================
function renderStrategyCards() {
    const container = document.getElementById("strategy-cards-container");
    container.innerHTML = "";

    state.flaggedProducts.forEach(p => {
        const priceDiffPct = Math.round(((p.price - p.competitorPrice) / p.price) * 100);
        let priceDiffText = "";
        if (priceDiffPct > 0) {
            priceDiffText = `⚠️ We are ${priceDiffPct}% more expensive than competitors!`;
        } else {
            priceDiffText = `⚖️ We are priced within market range of competitors.`;
        }

        const card = document.createElement("div");
        card.className = "strategy-card";
        
        card.innerHTML = `
            <div>
                <div class="strategy-card-header">
                    <span class="priority-rank">Priority #${p.priority}</span>
                    <span class="badge ${p.classification === 'Dead Stock' ? 'badge-danger' : 'badge-warning'}">${p.classification}</span>
                </div>
                <h3>${p.name}</h3>
                <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 4px;">SKU: ${p.sku} | ${p.category}</span>
                
                <div class="strategy-meta-grid">
                    <div class="meta-item">
                        <span class="meta-lbl">Current Stock</span>
                        <span class="meta-val">${p.quantity} units</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-lbl">Tied Capital</span>
                        <span class="meta-val">$${p.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-lbl">Current Price</span>
                        <span class="meta-val">$${p.price.toFixed(2)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-lbl">Rec. Markdown</span>
                        <span class="meta-val text-green">$${p.suggestedPrice.toFixed(2)} (${p.recommendedDiscount}%)</span>
                    </div>
                </div>

                <div class="price-difference-bubble" style="background-color: ${priceDiffPct > 0 ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)'}; color: ${priceDiffPct > 0 ? 'var(--color-red)' : 'var(--color-green)'}; border-color: ${priceDiffPct > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)'};">
                    ${priceDiffText}
                </div>

                <p class="strategy-summary-desc"><strong>Clearance Action:</strong> ${p.clearanceStrategy}</p>
            </div>

            <div class="strategy-actions-footer">
                <button class="btn btn-outline btn-sm btn-inspect-strategy" data-sku="${p.sku}">
                    <i data-lucide="eye"></i>
                    <span>Inspect Copies</span>
                </button>
                <button class="btn btn-primary btn-sm btn-download-single-pdf" data-sku="${p.sku}">
                    <i data-lucide="file-down"></i>
                    <span>Export PDF</span>
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    // Wire events
    const inspectBtns = container.querySelectorAll(".btn-inspect-strategy");
    inspectBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const sku = btn.getAttribute("data-sku");
            const prod = state.flaggedProducts.find(p => p.sku === sku);
            if (prod) openStrategyModal(prod);
        });
    });

    const pdfBtns = container.querySelectorAll(".btn-download-single-pdf");
    pdfBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const sku = btn.getAttribute("data-sku");
            const prod = state.flaggedProducts.find(p => p.sku === sku);
            if (prod) window.exportReportToPDF(state.flaggedProducts, prod);
        });
    });

    lucide.createIcons();
}

// ==========================================
// 8. Modal & Tab Copy Actions
// ==========================================
let activeModalProduct = null;

function initModalControls() {
    const modal = document.getElementById("strategy-modal");
    const closeBtn = document.getElementById("btn-close-modal");
    const tabs = document.querySelectorAll(".tab-btn");
    
    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        activeModalProduct = null;
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
            activeModalProduct = null;
        }
    });

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            const tabContents = document.querySelectorAll(".tab-content");
            tabContents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const target = tab.getAttribute("data-tab");
            document.getElementById(`tab-content-${target}`).classList.add("active");
        });
    });

    // Clipboard copy
    const copyBtns = document.querySelectorAll("[data-copy-target]");
    copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-copy-target");
            const targetEl = document.getElementById(targetId);
            
            if (targetEl) {
                targetEl.select();
                targetEl.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(targetEl.value);

                const origHTML = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" class="text-green"></i> <span>Copied!</span>`;
                lucide.createIcons();
                
                setTimeout(() => {
                    btn.innerHTML = origHTML;
                    lucide.createIcons();
                }, 1500);
            }
        });
    });
}

function openStrategyModal(product) {
    activeModalProduct = product;
    
    const modal = document.getElementById("strategy-modal");
    
    // Populate simple info
    document.getElementById("modal-product-name").textContent = product.name;
    document.getElementById("modal-product-sku").textContent = `SKU: ${product.sku} | ${product.category}`;
    
    document.getElementById("modal-qty").textContent = product.quantity;
    document.getElementById("modal-velocity").textContent = `${product.dailyVelocity} units/day`;
    document.getElementById("modal-turnover").textContent = `${product.turnoverRate}x`;
    document.getElementById("modal-dsi").textContent = `${product.dsi === Infinity ? "N/A" : product.dsi} days`;
    document.getElementById("modal-value").textContent = `$${product.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    const riskBadge = document.getElementById("modal-risk-badge");
    riskBadge.textContent = product.classification;
    riskBadge.className = "badge"; 
    if (product.classification === "Dead Stock") riskBadge.classList.add("badge-danger");
    else riskBadge.classList.add("badge-warning");

    document.getElementById("modal-risk-reason").textContent = product.classificationReason;

    // Pricing info
    document.getElementById("modal-current-price").textContent = product.price.toFixed(2);
    document.getElementById("modal-competitor-price").textContent = product.competitorPrice.toFixed(2);
    document.getElementById("modal-discount").textContent = product.recommendedDiscount;
    document.getElementById("modal-new-price").textContent = product.suggestedPrice.toFixed(2);

    // Copy targets
    document.getElementById("modal-email-subject").value = product.marketing.email.subject;
    document.getElementById("modal-email-body").value = product.marketing.email.body;
    document.getElementById("modal-facebook-body").value = product.marketing.facebook.body;
    document.getElementById("modal-google-hl1").value = product.marketing.google.headline1;
    document.getElementById("modal-google-hl2").value = product.marketing.google.headline2;
    document.getElementById("modal-google-desc").value = product.marketing.google.description;

    document.getElementById("modal-bundle-offer").textContent = product.bundleOffer;

    modal.classList.remove("hidden");
    document.querySelector(".tab-btn[data-tab='email']").click();
    lucide.createIcons();
}

// ==========================================
// 9. Full and Modal PDF triggers
// ==========================================
function initExportButtons() {
    const fullPdfBtn = document.getElementById("btn-export-full-pdf");
    const modalPdfBtn = document.getElementById("btn-modal-export-pdf");

    fullPdfBtn.addEventListener("click", () => {
        if (state.flaggedProducts.length === 0) {
            alert("No clearance catalog available. Run the AI agent first.");
            return;
        }
        window.exportReportToPDF(state.flaggedProducts);
    });

    modalPdfBtn.addEventListener("click", () => {
        if (activeModalProduct) {
            window.exportReportToPDF(state.flaggedProducts, activeModalProduct);
        }
    });
}

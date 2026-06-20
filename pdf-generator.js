/**
 * Trash to Treasure – PDF Report Generator Module
 */

/**
 * Exports a PDF report of clearance strategies and marketing assets.
 * @param {Array} allFlaggedProducts - Enriched product list from the AI workflow
 * @param {Object|null} singleProduct - If specified, exports only this product. Otherwise, exports the whole catalog.
 */
function exportReportToPDF(allFlaggedProducts, singleProduct = null) {
    const productsToExport = singleProduct ? [singleProduct] : allFlaggedProducts;
    
    if (productsToExport.length === 0) {
        alert("No recommendations available to export.");
        return;
    }

    // Create a temporary hidden container for the PDF content
    const container = document.createElement("div");
    container.style.padding = "20px";
    container.style.color = "#1e293b";
    container.style.fontFamily = "'Outfit', 'Segoe UI', Arial, sans-serif";
    container.style.backgroundColor = "#ffffff";
    container.style.lineHeight = "1.5";

    // Set custom print CSS variables inside the temp container
    const styles = `
        .pdf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 30px; }
        .pdf-title-main { font-size: 24px; font-weight: 700; color: #1e1b4b; margin: 0; }
        .pdf-subtitle { font-size: 12px; color: #64748b; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em; }
        .pdf-meta { text-align: right; font-size: 11px; color: #64748b; }
        .pdf-section-title { font-size: 18px; font-weight: 600; color: #312e81; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 25px 0 15px 0; }
        .pdf-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
        .pdf-summary-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; text-align: center; }
        .pdf-summary-val { font-size: 16px; font-weight: 700; color: #4f46e5; margin-bottom: 4px; }
        .pdf-summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 500; }
        .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
        .pdf-table th { background-color: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 8px; border: 1px solid #cbd5e1; }
        .pdf-table td { padding: 8px; border: 1px solid #cbd5e1; color: #334155; }
        .pdf-table tr:nth-child(even) { background-color: #f8fafc; }
        .pdf-product-block { margin-bottom: 40px; page-break-after: always; }
        .pdf-product-block:last-child { page-break-after: avoid; }
        .pdf-prod-title-bar { display: flex; justify-content: space-between; align-items: baseline; background-color: #e0e7ff; padding: 8px 12px; border-radius: 4px; margin-bottom: 15px; border-left: 4px solid #4f46e5; }
        .pdf-prod-name { font-size: 15px; font-weight: 700; color: #1e1b4b; margin: 0; }
        .pdf-prod-sku { font-size: 11px; color: #4f46e5; font-weight: 600; }
        .pdf-details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; font-size: 11px; margin-bottom: 15px; }
        .pdf-details-col { background-color: #fafafa; border: 1px dashed #e2e8f0; padding: 12px; border-radius: 6px; }
        .pdf-detail-item { margin-bottom: 6px; display: flex; justify-content: space-between; }
        .pdf-detail-label { font-weight: 600; color: #475569; }
        .pdf-detail-value { color: #0f172a; }
        .pdf-detail-value.highlight { font-weight: 700; color: #b91c1c; }
        .pdf-detail-value.gain { font-weight: 700; color: #15803d; }
        .pdf-marketing-container { font-size: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 15px; }
        .pdf-marketing-tab { font-weight: 700; color: #4f46e5; text-transform: uppercase; font-size: 9px; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
        .pdf-marketing-content { white-space: pre-wrap; font-family: monospace; color: #334155; margin-bottom: 12px; background-color: #ffffff; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; }
        .page-break { page-break-after: always; }
    `;

    // Inject stylesheet
    const styleElement = document.createElement("style");
    styleElement.innerHTML = styles;
    container.appendChild(styleElement);

    // Build header details
    const timestamp = new Date().toLocaleString();
    const reportTitle = singleProduct ? "Product Sales Strategy Sheet" : "Inventory Clearance Strategy Report";
    
    // ----------------------------------------------------
    // COVER PAGE OR MAIN HEADER
    // ----------------------------------------------------
    let headerHTML = `
        <div class="pdf-header">
            <div>
                <h1 class="pdf-title-main">Trash to Treasure</h1>
                <p class="pdf-subtitle">${reportTitle}</p>
            </div>
            <div class="pdf-meta">
                <p><strong>Generated By:</strong> Smart Sales AI Agent</p>
                <p><strong>Date:</strong> ${timestamp}</p>
                <p><strong>Status:</strong> Approved Strategy</p>
            </div>
        </div>
    `;
    
    container.innerHTML += headerHTML;

    // ----------------------------------------------------
    // OVERALL SUMMARY SECTION (For Catalog Report)
    // ----------------------------------------------------
    if (!singleProduct) {
        let totalQty = 0;
        let totalOriginalValue = 0;
        let totalNewValue = 0;
        
        productsToExport.forEach(p => {
            totalQty += p.quantity;
            totalOriginalValue += p.inventoryValue;
            totalNewValue += (p.quantity * p.suggestedPrice);
        });
        
        const capitalUnlocked = totalNewValue;
        const avgDiscount = productsToExport.reduce((acc, p) => acc + p.recommendedDiscount, 0) / productsToExport.length || 0;

        let summaryHTML = `
            <div class="pdf-summary-grid">
                <div class="pdf-summary-card">
                    <div class="pdf-summary-val">${productsToExport.length}</div>
                    <div class="pdf-summary-label">Flagged Products</div>
                </div>
                <div class="pdf-summary-card">
                    <div class="pdf-summary-val">$${totalOriginalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="pdf-summary-label">Capital Tied Up</div>
                </div>
                <div class="pdf-summary-card">
                    <div class="pdf-summary-val" style="color: #16a34a;">$${capitalUnlocked.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="pdf-summary-label">Capital to Unlock</div>
                </div>
                <div class="pdf-summary-card">
                    <div class="pdf-summary-val">${avgDiscount.toFixed(1)}%</div>
                    <div class="pdf-summary-label">Avg. Recommended Discount</div>
                </div>
            </div>

            <h2 class="pdf-section-title">Clearance Catalog Overview</h2>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Stock Qty</th>
                        <th>Risk Score</th>
                        <th>Current Price</th>
                        <th>Rec. Price</th>
                        <th>Tied Up Capital</th>
                    </tr>
                </thead>
                <tbody>
        `;

        productsToExport.forEach(p => {
            summaryHTML += `
                <tr>
                    <td><strong>#${p.priority}</strong></td>
                    <td>${p.name}</td>
                    <td>${p.sku}</td>
                    <td>${p.quantity}</td>
                    <td><span style="color: ${p.riskScore >= 75 ? '#b91c1c' : '#d97706'}">${p.riskScore}/100</span></td>
                    <td>$${p.price.toFixed(2)}</td>
                    <td><strong>$${p.suggestedPrice.toFixed(2)}</strong></td>
                    <td>$${p.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });

        summaryHTML += `
                </tbody>
            </table>
            <div class="page-break"></div>
        `;
        
        container.innerHTML += summaryHTML;
    }

    // ----------------------------------------------------
    // PRODUCT-BY-PRODUCT DETAILS
    // ----------------------------------------------------
    productsToExport.forEach((p, idx) => {
        let productHTML = `
            <div class="pdf-product-block">
                <div class="pdf-prod-title-bar">
                    <h3 class="pdf-prod-name">#${p.priority || (idx + 1)}: ${p.name}</h3>
                    <span class="pdf-prod-sku">${p.sku} | ${p.category}</span>
                </div>
                
                <div class="pdf-details-grid">
                    <!-- Column 1: Inventory & Metrics -->
                    <div class="pdf-details-col">
                        <h4 style="margin: 0 0 8px 0; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Inventory Metrics</h4>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Current Stock:</span>
                            <span class="pdf-detail-value">${p.quantity} units</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Sales Velocity (Daily):</span>
                            <span class="pdf-detail-value">${p.dailyVelocity} units/day</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Turnover Rate (Annual):</span>
                            <span class="pdf-detail-value">${p.turnoverRate}x</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Days Stock on Hand (DSI):</span>
                            <span class="pdf-detail-value">${p.dsi === Infinity ? "N/A" : p.dsi} days</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Classification Status:</span>
                            <span class="pdf-detail-value highlight">${p.classification}</span>
                        </div>
                        <div class="pdf-detail-item" style="margin-top: 6px; font-style: italic; color: #64748b;">
                            <span>${p.classificationReason}</span>
                        </div>
                    </div>
                    
                    <!-- Column 2: Clearance & Pricing Strategy -->
                    <div class="pdf-details-col">
                        <h4 style="margin: 0 0 8px 0; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Action Plan & Strategy</h4>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Current Retail Price:</span>
                            <span class="pdf-detail-value">$${p.price.toFixed(2)}</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Competitor Average:</span>
                            <span class="pdf-detail-value">$${p.competitorPrice.toFixed(2)}</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Recommended Markdown:</span>
                            <span class="pdf-detail-value highlight">${p.recommendedDiscount}% Discount</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Target Markdown Price:</span>
                            <span class="pdf-detail-value gain">$${p.suggestedPrice.toFixed(2)}</span>
                        </div>
                        <div class="pdf-detail-item">
                            <span class="pdf-detail-label">Clearance Strategy:</span>
                            <span class="pdf-detail-value" style="font-weight: 500;">${p.clearanceStrategy}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Bundle Recommendation -->
                <div style="font-size: 11px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin-bottom: 15px; color: #166534;">
                    <strong>🎁 Smart Bundle Recommendation:</strong> ${p.bundleOffer}
                </div>

                <!-- Marketing Content Section -->
                <h4 style="margin: 15px 0 8px 0; font-size: 12px; color: #334155;">Generated AI Marketing Assets</h4>
                <div class="pdf-marketing-container">
                    <div class="pdf-marketing-tab">📧 Promotional Email Copy</div>
                    <div class="pdf-marketing-content"><strong>Subject:</strong> ${p.marketing.email.subject}\n\n${p.marketing.email.body}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <div class="pdf-marketing-tab">📱 Social Media Ad Copy (Facebook / Instagram)</div>
                            <div class="pdf-marketing-content" style="height: 100px; overflow: hidden; text-overflow: ellipsis; font-size: 9px;">${p.marketing.facebook.body}</div>
                        </div>
                        <div>
                            <div class="pdf-marketing-tab">🌐 Google Ads Search Copy</div>
                            <div class="pdf-marketing-content" style="height: 100px; overflow: hidden; text-overflow: ellipsis; font-size: 9px;"><strong>Headline 1:</strong> ${p.marketing.google.headline1}\n<strong>Headline 2:</strong> ${p.marketing.google.headline2}\n<strong>Description:</strong> ${p.marketing.google.description}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += productHTML;
    });

    // Run html2pdf.js compilation
    const opt = {
        margin: [10, 10, 10, 10],
        filename: singleProduct ? `strategy_${singleProduct.sku}.pdf` : `clearance_report_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        console.log("PDF download triggered successfully.");
    }).catch(err => {
        console.error("PDF generation error: ", err);
        alert("Failed to export PDF. Please check console logs.");
    });
}

// Export to window object for browser access
window.exportReportToPDF = exportReportToPDF;

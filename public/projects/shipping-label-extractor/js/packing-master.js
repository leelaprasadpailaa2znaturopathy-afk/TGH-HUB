
document.addEventListener('DOMContentLoaded', () => {
    // We need to wait for the DOM to be fully loaded
    // and elements to be available
    const packingInput = document.getElementById('packingFile');
    const ordersInput = document.getElementById('ordersFile');
    const processBtn = document.getElementById('processBtn');
    const outputPre = document.getElementById('output');
    const resultDiv = document.getElementById('resultSection');
    const previewBody = document.getElementById('previewBody');
    let lastProcessedPackingRows = [];

    if (!packingInput || !ordersInput || !processBtn) {
        // Elements might not exist if this script runs on a page without them
        return;
    }

    function checkFiles() {
        if (packingInput.files.length && ordersInput.files.length) {
            processBtn.disabled = false;
        } else {
            processBtn.disabled = true;
        }
    }

    packingInput.addEventListener('change', checkFiles);
    ordersInput.addEventListener('change', checkFiles);

    processBtn.addEventListener('click', async () => {
        processBtn.disabled = true;
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = '<span class="loading"></span> Processing...';

        outputPre.textContent = 'Reading files...';
        resultDiv.style.display = 'block';

        try {
            const packingData = await readSheet(packingInput.files[0]);
            const ordersData = await readSheet(ordersInput.files[0]);

            outputPre.textContent += `\nPacking Master: ${packingData.length} rows`;
            outputPre.textContent += `\nOrders File: ${ordersData.length} rows`;

            processMatching(packingData, ordersData);

        } catch (err) {
            outputPre.textContent = `Error:\n${err.message || String(err)}`;
            console.error(err);
        } finally {
            processBtn.disabled = false;
            processBtn.innerHTML = originalText;
        }
    });

    async function readSheet(file) {
        if (typeof XLSX === 'undefined') {
            throw new Error("SheetJS (XLSX) library not loaded. Please refresh the page.");
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    // header: 1 returns array of arrays
                    resolve(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function processMatching(packingRows, ordersRows) {
        lastProcessedPackingRows = packingRows;
        outputPre.textContent += '\n\nStarting matching process...';

        const clean = val => String(val).replace(/[\s#]+/g, '').toUpperCase();

        // 1. Get IDs from Orders File (the labels)
        const ordersHeader = ordersRows[0].map(h => String(h).toLowerCase());
        let orderIdColIndex = ordersHeader.findIndex(h => h.includes('order') && h.includes('id'));
        if (orderIdColIndex === -1) orderIdColIndex = 0;

        const allUploadedOrderIds = [];
        const uniqueOrderedIds = new Set();

        for (let i = 1; i < ordersRows.length; i++) {
            const row = ordersRows[i];
            const rawId = row[orderIdColIndex];
            if (!rawId) continue;

            const orderId = clean(rawId);
            allUploadedOrderIds.push(orderId);
            uniqueOrderedIds.add(orderId);
        }

        outputPre.textContent += `\nExtracted ${allUploadedOrderIds.length} IDs from ${ordersRows.length - 1} label rows.`;
        outputPre.textContent += `\nFound ${uniqueOrderedIds.size} unique order IDs.`;

        // 2. Process Packing Master
        const packingHeader = packingRows[0].map(h => String(h).toLowerCase());
        let packingOrderIdIndex = packingHeader.findIndex(h => h.includes('order') && h.includes('id'));
        if (packingOrderIdIndex === -1) packingOrderIdIndex = 0;

        if (packingRows[0][packingRows[0].length - 1] !== 'Status') {
            packingRows[0].push('Status');
        }

        let matchCount = 0;
        let notReceivedCount = 0;
        const masterOrderIds = new Set();

        window.pendingOrdersData = [];
        window.pendingFullRows = [];

        for (let i = 1; i < packingRows.length; i++) {
            const row = packingRows[i];
            while (row.length < packingRows[0].length - 1) row.push('');

            const orderId = clean(row[packingOrderIdIndex]);
            if (!orderId) continue;

            masterOrderIds.add(orderId);

            if (uniqueOrderedIds.has(orderId)) {
                row[packingRows[0].length - 1] = 'RECEIVED';
                matchCount++;
            } else {
                row[packingRows[0].length - 1] = 'PENDING';
                notReceivedCount++;
                window.pendingOrdersData.push(orderId);
                window.pendingFullRows.push(row);
            }
        }

        // 3. Find unrecognized labels
        const unrecognizedList = [];
        uniqueOrderedIds.forEach(id => {
            if (!masterOrderIds.has(id)) {
                unrecognizedList.push(id);
            }
        });

        // Log results
        outputPre.textContent += `\n\nResults Summary:`;
        outputPre.textContent += `\n✅ Matched in Master: ${matchCount}`;
        outputPre.textContent += `\n⏳ Pending (Not Received): ${notReceivedCount}`;
        outputPre.textContent += `\n⚠️ Unrecognized Labels (Not in Master): ${unrecognizedList.length}`;

        if (previewBody) {
            previewBody.innerHTML = '';
            packingRows.slice(0, 50).forEach((row, idx) => {
                if (idx === 0) return;
                const tr = document.createElement('tr');
                const status = row[row.length - 1];
                const badgeClass = status === 'RECEIVED' ? 'badge-awb' : 'badge-none';

                tr.innerHTML = `
                    <td>${idx}</td>
                    <td>${row[packingOrderIdIndex]}</td>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
                `;
                previewBody.appendChild(tr);
            });
        }

        const missingOrdersPre = document.getElementById('missingOrders');
        if (missingOrdersPre) {
            if (unrecognizedList.length > 0) {
                missingOrdersPre.innerHTML = `[NOT IN MASTER - ${unrecognizedList.length}]\n${unrecognizedList.join('\n')}`;
            } else {
                missingOrdersPre.innerHTML = "All labels accounted for in Master.";
            }
        }

        // Update Pending List
        const pendingOrdersDiv = document.getElementById('pendingOrders');
        if (pendingOrdersDiv) {
            if (window.pendingOrdersData.length > 0) {
                pendingOrdersDiv.innerHTML = `
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${window.pendingOrdersData.map(id => `
                                    <tr>
                                        <td class="font-mono">${id}</td>
                                        <td><span class="badge badge-none">PENDING</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                pendingOrdersDiv.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No pending orders found.</div>';
            }
        }
    }

    // Setup Button Actions
    const downloadBtn = document.getElementById('downloadUpdatedBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            if (!lastProcessedPackingRows || lastProcessedPackingRows.length === 0) {
                alert('Please process files first.');
                return;
            }
            const ws = XLSX.utils.aoa_to_sheet(lastProcessedPackingRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "UpdatedPacking");
            XLSX.writeFile(wb, "Updated_Packing_Master.xlsx");
        };
    }

    const exportPendingBtn = document.getElementById('exportPendingBtn');
    if (exportPendingBtn) {
        exportPendingBtn.onclick = () => {
            if (window.pendingOrdersData.length === 0) {
                alert('No pending orders to export.');
                return;
            }
            const ws = XLSX.utils.aoa_to_sheet([["Pending Order ID"], ...window.pendingOrdersData.map(id => [id])]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "PendingOrders");
            XLSX.writeFile(wb, "Pending_Orders.xlsx");
        };
    }

    const goToPage4Btn = document.getElementById('goToPage4Btn');
    if (goToPage4Btn) {
        goToPage4Btn.onclick = () => {
            if (window.switchSection) {
                window.switchSection('#section4');
            } else {
                // Manual fallback
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.getElementById('section4').classList.add('active');
            }

            const box = document.getElementById('formattedPendingBox');
            if (box) {
                box.value = window.pendingOrdersData.join(',');
            }

            const countEl = document.getElementById('formattedCount');
            if (countEl) {
                countEl.textContent = `${window.pendingOrdersData.length} Orders Found`;
            }
        };
    }

    const backToPage3Btn = document.getElementById('backToPage3Btn');
    if (backToPage3Btn) {
        backToPage3Btn.addEventListener('click', () => {
            if (window.switchSection) window.switchSection('#section3');
        });
    }

    const copyFormattedBtn = document.getElementById('copyFormattedBtn');
    if (copyFormattedBtn) {
        copyFormattedBtn.onclick = () => {
            const box = document.getElementById('formattedPendingBox');
            if (box) {
                box.select();
                document.execCommand('copy');
                alert('Copied to clipboard!');
            }
        };
    }
});

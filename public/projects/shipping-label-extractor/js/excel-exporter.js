class ExcelExporter {
    exportToExcel(data, filename = 'extracted_source_ids.xlsx') {
        if (typeof XLSX === 'undefined') {
            alert('XLSX library not loaded. Please wait a moment or refresh.');
            return;
        }
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }

        // Prepare data for Excel
        const exportData = data.map(item => ({
            'Source ID': item.sourceId || 'Unknown',
            'AWB Code': item.awbCode || 'Unknown',
            'Courier Name': item.courierName || 'Unknown',
            'File Name': item.fileName || '',
            'Page Number': item.page || '',
            'Extraction Type': item.sourceId ? 'Source ID' : (item.awbCode ? 'AWB Code' : 'None'),
            'Timestamp': new Date().toISOString()
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Auto-size columns
        const colWidths = [
            { wch: 15 }, // Source ID
            { wch: 15 }, // AWB Code
            { wch: 20 }, // Courier Name
            { wch: 20 }, // File Name
            { wch: 12 }, // Page Number
            { wch: 15 }, // Extraction Type
            { wch: 20 }  // Timestamp
        ];
        ws['!cols'] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Extracted IDs');

        // Add summary sheet with source IDs only
        if (window.sourceIdsOnly && window.sourceIdsOnly.length > 0) {
            const sourceOnlyData = window.sourceIdsOnly.map(id => ({ 'Source ID': id }));
            const sourceWs = XLSX.utils.json_to_sheet(sourceOnlyData);
            sourceWs['!cols'] = [{ wch: 15 }];
            XLSX.utils.book_append_sheet(wb, sourceWs, 'Source IDs Only');
        }

        // Export
        XLSX.writeFile(wb, filename);
    }

    exportToCSV(data, filename = 'extracted_source_ids.csv') {
        if (typeof XLSX === 'undefined') {
            alert('XLSX library not loaded.');
            return;
        }
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }

        const exportData = data.map(item => ({
            'Source ID': item.sourceId || 'Unknown',
            'AWB Code': item.awbCode || 'Unknown',
            'Courier Name': item.courierName || 'Unknown',
            'File Name': item.fileName || '',
            'Page Number': item.page || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Extracted IDs');

        XLSX.writeFile(wb, filename);
    }

    copyToClipboard(data) {
        if (!data || data.length === 0) {
            alert('No data to copy');
            return;
        }

        // Copy source IDs only, one per line
        const sourceIdsText = window.sourceIdsOnly ? window.sourceIdsOnly.join('\n') : '';

        navigator.clipboard.writeText(sourceIdsText).then(() => {
            alert('Source IDs copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = sourceIdsText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Source IDs copied to clipboard!');
        });
    }

    updatePreview(data) {
        const previewText = document.getElementById('previewText');
        if (!previewText) return;

        if (window.sourceIdsOnly && window.sourceIdsOnly.length > 0) {
            previewText.value = window.sourceIdsOnly.join('\n');
        } else {
            previewText.value = 'No Source IDs found';
        }
    }

    populateReviewTable(data) {
        const tbody = document.getElementById('reviewTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        data.forEach((item, index) => {
            const row = document.createElement('tr');

            const idValue = item.sourceId || 'N/A';
            const courier = item.courierName || 'Unknown';
            const awb = item.awbCode || 'Unknown';

            let idTypeClass = 'badge-none';
            let idTypeText = 'N/A';

            if (item.status === 'Manual Review') {
                idTypeClass = 'badge-manual';
                idTypeText = 'Review Needed';
            } else if (item.sourceId && item.sourceId !== 'N/A' && item.sourceId !== 'Unknown') {
                idTypeClass = 'badge-source';
                idTypeText = 'Source ID';
            } else if (item.awbCode && item.awbCode !== 'Unknown') {
                idTypeClass = 'badge-awb';
                idTypeText = 'AWB Detected';
            }

            row.innerHTML = `
                <td class="${idValue === 'N/A' ? 'text-na' : 'fw-bold'}">${idValue}</td>
                <td>${courier}</td>
                <td class="font-mono">${awb}</td>
                <td title="${item.fileName}">
                    <div class="file-table-info">
                        <span class="file-name-truncated">${item.fileName}</span>
                        <span class="file-page-tag">Page ${item.page}</span>
                    </div>
                </td>
                <td><span class="badge ${idTypeClass}">${idTypeText}</span></td>
                <td>
                    <button class="btn btn-danger-soft btn-sm" onclick="removeRow(${index})">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Update stats
        this.updateStats(data);
    }

    updateStats(data) {
        const sourceCount = data.filter(item => item.sourceId && item.sourceId !== 'N/A' && item.sourceId !== 'Unknown').length;
        const otherCount = data.filter(item => (!item.sourceId || item.sourceId === 'N/A' || item.sourceId === 'Unknown') && item.awbCode && item.awbCode !== 'Unknown').length;
        const totalCount = data.length;

        const totalEl = document.getElementById('totalCount');
        const sourceEl = document.getElementById('sourceCount');
        const otherEl = document.getElementById('otherCount');

        if (totalEl) totalEl.textContent = totalCount;
        if (sourceEl) sourceEl.textContent = sourceCount;
        if (otherEl) otherEl.textContent = otherCount;
    }
}

// Initialize exporter
window.excelExporter = new ExcelExporter();
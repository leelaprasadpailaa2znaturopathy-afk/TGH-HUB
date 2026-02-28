let uploadedFiles = [], amazonFiles = [];
window.extractedData = []; window.sourceIdsOnly = []; window.pendingOrdersData = [];

// Amazon AI Scanner Integration
const amazonUploadZone = document.getElementById('amazonUploadZone'), amazonPdfInput = document.getElementById('amazonPdfInput'), amazonFileListItems = document.getElementById('amazonFileListItems');
if (amazonPdfInput) amazonPdfInput.addEventListener('change', (e) => handleAmazonFiles(e.target.files));
if (amazonUploadZone) {
    amazonUploadZone.onclick = () => amazonPdfInput?.click();
    amazonUploadZone.ondragover = (e) => { e.preventDefault(); amazonUploadZone.style.borderColor = 'var(--primary)'; };
    amazonUploadZone.ondragleave = () => { amazonUploadZone.style.borderColor = '#fbbf24'; };
    amazonUploadZone.ondrop = (e) => { e.preventDefault(); amazonUploadZone.style.borderColor = '#fbbf24'; handleAmazonFiles(e.dataTransfer?.files); };
}

function handleAmazonFiles(filesList) {
    if (!filesList) return;
    Array.from(filesList).filter(f => f.type === 'application/pdf').forEach(file => {
        if (!amazonFiles.find(af => af.name === file.name)) amazonFiles.push(file);
    });
    displayAmazonFileList();
}

function displayAmazonFileList() {
    if (!amazonFileListItems) return;
    amazonFileListItems.innerHTML = amazonFiles.map((file, i) => `
        <li class="file-item">
            <div class="file-info"><i class="fa-brands fa-amazon" style="color: #f59e0b;"></i><div class="file-details"><div class="file-name">${file.name}</div><div class="file-size">${formatFileSize(file.size)}</div></div></div>
            <button class="btn btn-danger-soft btn-sm" onclick="removeAmazonFile(${i})"><i class="fa-solid fa-xmark"></i></button>
        </li>`).join('');
    document.getElementById('amazonFileCount').textContent = amazonFiles.length;
    document.getElementById('amazonProcessingArea').classList.toggle('hidden', amazonFiles.length === 0);
}

window.removeAmazonFile = (idx) => { amazonFiles.splice(idx, 1); displayAmazonFileList(); };

window.processAmazonFiles = async () => {
    if (amazonFiles.length === 0) return;
    const btn = document.getElementById('processAmazonBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> AI Scanning...';
    try {
        const results = (await Promise.all(amazonFiles.map(f => window.pdfProcessor.processAmazonPDF(f)))).flat();
        window.extractedData = [...(window.extractedData || []).filter(item => !amazonFiles.some(f => f.name === item.fileName)), ...results];
        finalizeResults();
    } catch (err) { alert('OCR Error: ' + err.message); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-microchip"></i> Run AI OCR Scan'; }
};

function finalizeResults() {
    const data = window.extractedData;
    window.sourceIdsOnly = data.filter(r => r.sourceId !== 'N/A').map(r => r.sourceId);
    window.pdfProcessor.displayExtractedIds(data);
    setTimeout(() => {
        switchSection('#section2');
        window.excelExporter.populateReviewTable(data);
        window.excelExporter.updatePreview(data);
    }, 500);
}

function switchSection(id) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', `#${s.id}` === id));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.getAttribute('href') === id));
    if (id === '#section2' && window.extractedData) {
        window.excelExporter.populateReviewTable(window.extractedData);
        window.excelExporter.updatePreview(window.extractedData);
    }
}

document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', (e) => { e.preventDefault(); switchSection(e.target.getAttribute('href')); }));

const uploadZone = document.getElementById('uploadZone'), pdfInput = document.getElementById('pdfInput'), fileListItems = document.getElementById('fileListItems');
if (pdfInput) pdfInput.onchange = (e) => handleFiles(e.target.files);
if (uploadZone) {
    uploadZone.onclick = () => pdfInput?.click();
    uploadZone.ondragover = (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); };
    uploadZone.ondragleave = () => uploadZone.classList.remove('dragover');
    uploadZone.ondrop = (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFiles(e.dataTransfer?.files); };
}

function handleFiles(list) {
    if (!list) return;
    Array.from(list).filter(f => f.type === 'application/pdf').forEach(file => {
        if (!uploadedFiles.find(uf => uf.name === file.name)) uploadedFiles.push(file);
    });
    displayFileList();
}

function displayFileList() {
    if (!fileListItems) return;
    fileListItems.innerHTML = uploadedFiles.map((file, i) => `
        <li class="file-item">
            <div class="file-info"><i class="fa-solid fa-file-pdf"></i><div class="file-details"><div class="file-name">${file.name}</div><div class="file-size">${formatFileSize(file.size)}</div></div></div>
            <button class="btn btn-danger-soft btn-sm" onclick="removeFile(${i})"><i class="fa-solid fa-xmark"></i></button>
        </li>`).join('');
    document.getElementById('fileCount').textContent = uploadedFiles.length;
    document.getElementById('processingArea').classList.toggle('hidden', uploadedFiles.length === 0);
}

function formatFileSize(b) {
    if (!b) return '0 Bytes';
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(2) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
}

window.removeFile = (i) => { uploadedFiles.splice(i, 1); displayFileList(); };
window.proceedToReview = () => switchSection('#section2');

async function processAllFiles() {
    if (uploadedFiles.length === 0) return;
    const btn = document.getElementById('processAllBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing...';
    document.getElementById('extractionProgress').classList.remove('hidden');

    try {
        const { normalData, amazonPdfs } = await window.pdfProcessor.processMultiplePDFs(uploadedFiles);
        window.extractedData = normalData;

        if (amazonPdfs.length > 0) {
            btn.innerHTML = '<span class="spinner"></span> AI Scanning Amazon...';
            amazonPdfs.forEach(p => { if (!amazonFiles.find(af => af.name === p.name)) amazonFiles.push(p); });
            displayAmazonFileList();
            const amazonResults = (await Promise.all(amazonPdfs.map(f => window.pdfProcessor.processAmazonPDF(f)))).flat();

            // Merge: Keep normal data but replace rows from files that were re-scanned with AI
            const scannedFilenames = new Set(amazonPdfs.map(f => f.name));
            window.extractedData = [
                ...window.extractedData.filter(item => !scannedFilenames.has(item.fileName)),
                ...amazonResults
            ];
        }


        document.getElementById('extractedIds').classList.remove('hidden');
        finalizeResults();
    } catch (err) { alert('Error: ' + err.message); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Reprocess Files'; }
}

window.processAllFiles = processAllFiles;
window.exportToExcel = () => window.excelExporter.exportToExcel(window.extractedData, `shipping_data_${new Date().toLocaleDateString()}.xlsx`);
window.exportToCSV = () => window.excelExporter.exportToCSV(window.extractedData, `shipping_data_${new Date().toLocaleDateString()}.csv`);
window.copyToClipboard = () => window.excelExporter.copyToClipboard(window.extractedData);
window.removeRow = (i) => { window.extractedData.splice(i, 1); finalizeResults(); };

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.onclick = () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    };
    switchSection('#section1');
});


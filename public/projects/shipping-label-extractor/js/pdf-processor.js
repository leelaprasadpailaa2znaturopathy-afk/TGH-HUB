class PDFProcessor {
    constructor() {
        this.pdfjsLib = window.pdfjsLib;
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        this.scheduler = null;
        this.maxWorkers = navigator.hardwareConcurrency || 4;
    }

    async getScheduler() {
        if (this.scheduler) return this.scheduler;
        if (typeof Tesseract === 'undefined') throw new Error("Tesseract.js not loaded.");

        this.scheduler = Tesseract.createScheduler();
        const workerInits = [];
        for (let i = 0; i < Math.min(this.maxWorkers, 8); i++) {
            workerInits.push(Tesseract.createWorker('eng').then(w => this.scheduler.addWorker(w)));
        }
        await Promise.all(workerInits);
        return this.scheduler;
    }

    async processPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await this.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), verbosity: 0 }).promise;
        const totalPages = pdf.numPages;
        const results = [];

        // Process in larger parallel chunks for speed
        const CHUNK_SIZE = 15;
        for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
            const tasks = [];
            for (let j = i; j < i + CHUNK_SIZE && j <= totalPages; j++) {
                tasks.push(this.processPage(pdf, j, file.name));
            }
            results.push(...(await Promise.all(tasks)));
            this.updateProgress(null, `Reading ${file.name}: ${Math.min(i + CHUNK_SIZE - 1, totalPages)}/${totalPages}`);
        }
        return results;
    }

    async processPage(pdf, pageNum, fileName) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const fullText = textContent.items.map(item => item.str).join(' ');
        const cleanText = fullText.replace(/\s+/g, ' ');

        let sourceId = this.extractSourceId(fullText);
        let courierName = this.extractCourier(fullText);
        let awbCode = this.extractAWB(fullText);
        const isAmazon = this.isAmazonPage(cleanText, fileName);

        if (isAmazon) {
            courierName = courierName || 'Amazon Shipping';
            if (!awbCode) {
                const amazonAwbMatch = cleanText.match(/([34][\d\s\-]{11,15})/);
                if (amazonAwbMatch) awbCode = amazonAwbMatch[0].replace(/\D/g, '');
            }
        }



        return {
            page: pageNum,
            sourceId: sourceId || 'N/A',
            awbCode: awbCode || 'Unknown',
            courierName: courierName || 'Unknown',
            fileName,
            fullText,
            isAmazon,
            status: (sourceId && sourceId !== 'N/A') || (awbCode && awbCode !== 'Unknown') ? 'Success' : 'Manual Review'
        };
    }

    isAmazonPage(text, fileName = '') {
        const t = (text + ' ' + (fileName || '')).toLowerCase();
        return t.includes('amazon') || t.includes('itsc') || t.includes('delivery station') || (/\b[34]\d{11}\b/).test(text.replace(/\s+/g, ''));
    }


    extractSourceId(text) {
        const patterns = [
            /Ref\.?\s*No\.?[:\s]*(S\d{5,12})/i,
            /Order\s*[#:]?\s*[^\s]+-(S\d{5,12})/i,
            /\b(S\d{6,10})\b/i,
            /S\s*\d{5,10}/gi,
            /\d{3}-\d{7}-\d{7}/ // Amazon Order ID pattern
        ];
        for (const p of patterns) {
            const m = text.match(p);
            if (m) return (m[1] || m[0]).replace(/\s+/g, '').toUpperCase();
        }
        return null;
    }


    extractCourier(text) {
        const t = text.toLowerCase();
        const mapping = { 'delhivery': 'Delhivery', 'dtdc': 'DTDC', 'ekart': 'Ekart', 'amazon': 'Amazon Shipping', 'ecom express': 'Ecom Express', 'bluedart': 'Blue Dart', 'blue dart': 'Blue Dart', 'xpressbees': 'XpressBees' };
        for (const [key, val] of Object.entries(mapping)) if (t.includes(key)) return val;
        if (text.match(/\b7X\d{7,12}\b/i)) return 'DTDC';
        return null;
    }

    extractAWB(text) {
        const compressed = text.replace(/[^A-Z0-9]/gi, '');
        const patterns = [
            /AWB[#:]?\s*([A-Z0-9]{10,20})/i,
            /\b(7X\d{7,12})\b/i,
            /\b([34]\d{11})\b/,
            /([34][\d\s\-]{11,15})/, // Flexible Amazon pattern
            /([A-Z]{3}\d{8}[A-Z]\d)/,
            /([A-Z]{2}\d{9}[A-Z]{2})/,
            /\b(\d{10,16})\b/
        ];
        for (const p of patterns) {
            const m = text.match(p) || compressed.match(p);
            if (m) {
                const val = (m[1] || m[0]).replace(/[^A-Z0-9]/gi, '');
                if (val.length >= 10) return val;
            }
        }
        return null;
    }


    async processMultiplePDFs(files) {
        const allNormalData = [];
        const amazonPdfs = [];

        // Parallel file processing with concurrency control
        const CONCURRENCY = 3;
        for (let i = 0; i < files.length; i += CONCURRENCY) {
            const batch = files.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (file) => {
                this.updateProgress((i / files.length) * 100, `Processing ${file.name}...`);
                const results = await this.processPDF(file);
                allNormalData.push(...results);

                const amazonPages = results.filter(p => p.isAmazon).map(p => p.page);
                if (amazonPages.length > 0) {
                    amazonPdfs.push(await this.extractPages(file, amazonPages));
                }
            }));
        }
        return { normalData: allNormalData, amazonPdfs };
    }

    updateProgress(percentage, text) {
        const fill = document.getElementById('progressFill'), txt = document.getElementById('progressText');
        if (fill && percentage !== null) fill.style.width = percentage + '%';
        if (txt) txt.textContent = text;
    }

    displayExtractedIds(data) {
        const container = document.getElementById('idsContainer');
        if (!container) return;
        container.innerHTML = '';
        const uniqueIds = [...new Set(data.map(item => item.sourceId !== 'N/A' ? item.sourceId : item.awbCode).filter(id => id && id !== 'Unknown'))];
        if (uniqueIds.length === 0) {
            container.innerHTML = '<div class="console-output" style="color:#F59E0B">No IDs detected automatically.</div>';
        } else {
            uniqueIds.forEach(id => {
                const el = document.createElement('span');
                el.className = `id-item ${String(id).startsWith('S') ? 'source-id' : ''}`;
                el.textContent = id;
                container.appendChild(el);
            });
        }
    }

    async processAmazonPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await this.pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
        return Promise.all(Array.from({ length: pdf.numPages }, (_, i) => this.scanAmazonPage(pdf, i + 1, file.name)));
    }

    async scanAmazonPage(pdf, pageNum, fileName) {
        const page = await pdf.getPage(pageNum);
        this.updateProgress(null, `AI Scanning: ${fileName} (P${pageNum})`);
        const ocr = await this.performOCR(page);

        const sourceId = ocr.sourceId || ocr.orderId || 'N/A';
        const awbCode = ocr.awb || 'Unknown';

        return {
            page: pageNum,
            sourceId: sourceId,
            awbCode: awbCode,
            courierName: ocr.courier || 'Amazon Shipping',
            fileName: fileName,
            status: (sourceId !== 'N/A' || awbCode !== 'Unknown') ? 'Success' : 'Manual Review'
        };
    }


    async extractPages(file, pageIndices) {
        const lib = window.PDFLib;
        const srcDoc = await lib.PDFDocument.load(await file.arrayBuffer());
        const newDoc = await lib.PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, pageIndices.map(i => i - 1));
        copied.forEach(p => newDoc.addPage(p));
        return new File([await newDoc.save()], `amazon_${file.name}`, { type: 'application/pdf' });
    }

    async performOCR(page) {
        // Higher scale for better OCR on small labels
        const viewport = page.getViewport({ scale: 3.2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height; canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.filter = 'contrast(1.4) grayscale(1)';
        tempCtx.drawImage(canvas, 0, 0);

        const scheduler = await this.getScheduler();
        const { data: { text } } = await scheduler.addJob('recognize', tempCanvas);
        const cleanText = text.replace(/\s+/g, ' ');
        const compressed = text.replace(/[^A-Z0-9]/gi, '');

        // 1. Extract Tracking / AWB
        let awb = null;
        const awbPatterns = [
            /TBA\d{12}/i,
            /\b([34]\d{11})\b/,
            /([34][\d\s\-]{11,15})/,
            /Tracking\s*ID[:\s]*([A-Z0-9]{10,22})/i,
            /AWB[:\s]*([A-Z0-9]{10,22})/i,
            /\d{12,18}/ // Generic long number fallback
        ];

        for (const p of awbPatterns) {
            const m = cleanText.match(p) || compressed.match(p);
            if (m) {
                const val = (m[1] || m[0]).replace(/[^A-Z0-9]/gi, '');
                if (val.length >= 10) {
                    awb = val;
                    break;
                }
            }
        }

        // 2. Extract Source ID (SXXXXX)
        let sourceId = this.extractSourceId(cleanText);
        if (!sourceId) sourceId = this.extractSourceId(compressed);

        // 3. Extract Amazon Order ID (403-XXXXXXX-XXXXXXX)
        let orderId = null;
        const orderMatch = cleanText.match(/\d{3}-\d{7}-\d{7}/);
        if (orderMatch) orderId = orderMatch[0];

        // 4. Detect Courier
        let courier = 'Amazon Shipping';
        const couriers = ["Delhivery", "Blue Dart", "Ecom Express", "XpressBees", "DTDC", "Shiprocket", "Ekart"];
        for (const c of couriers) {
            if (cleanText.toLowerCase().includes(c.toLowerCase())) {
                courier = c;
                break;
            }
        }

        return { awb, courier, sourceId, orderId };
    }


}

window.pdfProcessor = new PDFProcessor();

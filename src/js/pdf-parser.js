/**
 * PDF Parser Module
 * Uses pdf.js to extract text content from PDF files
 */

// Configure pdf.js worker
// Note: pdf.js is loaded via script tag in index.html
const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (!pdfjsLib) {
    console.error('pdf.js library not loaded!');
}
// Use vendored worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';

// Create worker immediately on page load
const sharedWorker = new pdfjsLib.PDFWorker();

/**
 * Extract text content from a PDF file
 * @param {File} file - The PDF file to process
 * @returns {Promise<string>} - The extracted text content
 */
export async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        worker: sharedWorker
    }).promise;

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract text items and join with spaces
        // Preserve some structure by adding newlines between distant items
        let lastY = null;
        let pageText = '';

        for (const item of textContent.items) {
            // Use Y-threshold of 5 to properly group text on same line
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
            }
            pageText += item.str + ' ';
            lastY = item.transform[5];
        }

        fullText += pageText + '\n\n--- PAGE BREAK ---\n\n';
    }

    return fullText;
}

/**
 * Process multiple PDF files
 * @param {FileList|File[]} files - Array of PDF files
 * @param {Function} progressCallback - Called with progress updates
 * @returns {Promise<Array<{file: File, text: string, error?: string}>>}
 */
export async function processMultiplePDFs(files, progressCallback) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progressCallback?.(i + 1, files.length, file.name);

        try {
            const text = await extractTextFromPDF(file);
            results.push({ file, text });
        } catch (error) {
            results.push({ file, text: '', error: error.message });
        }
    }

    return results;
}

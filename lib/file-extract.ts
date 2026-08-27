// Text extraction from PDF and DOCX files in the browser

/**
 * Extract text from a .docx file using mammoth
 */
export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore - mammoth has no types in this setup
  const mammoth = await import('mammoth/mammoth.browser');
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Extract text from a .pdf file using pdfjs-dist
 */
export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');

  // Use the bundled worker
  // @ts-ignore
  if (pdfjs.GlobalWorkerOptions) {
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  }

  // @ts-ignore
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

/**
 * Extract text from any supported file type
 * Returns extracted text or null if the format isn't supported
 */
export async function extractFileText(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'txt':
    case 'md':
    case 'csv':
      return await file.text();

    case 'docx':
      return await extractDocxText(file);

    case 'pdf':
      return await extractPdfText(file);

    default:
      return null;
  }
}

/**
 * Check if a file type is supported
 */
export function isSupportedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['txt', 'md', 'csv', 'docx', 'pdf'].includes(ext || '');
}

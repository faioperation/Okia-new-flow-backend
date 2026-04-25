import fs from 'fs/promises';
import Tesseract from 'tesseract.js';
const pdf = require('pdf-parse');

export const extractTextFromPdf = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    let extractedText = "";
    
    // 1. Try standard text extraction
    if (typeof pdf === 'function') {
      const data = await pdf(dataBuffer);
      extractedText = data.text;
    } else if (pdf.PDFParse) {
      const parser = new pdf.PDFParse(new Uint8Array(dataBuffer));
      const result = await parser.getText();
      extractedText = result.text;
    } else {
      const pdfLib = pdf.default || pdf;
      if (typeof pdfLib === 'function') {
         const data = await pdfLib(dataBuffer);
         extractedText = data.text;
      }
    }

    // 2. Smart Detection: If text is too short, it might be a scanned PDF
    if (extractedText.trim().length < 100) {
      console.log(`Low text density detected for ${filePath}, attempting OCR...`);
      
      // Attempt OCR on the PDF file directly (Tesseract.js supports this)
      const ocrResult = await Tesseract.recognize(
        filePath,
        'eng',
        { logger: m => console.log(m.status) }
      );
      
      if (ocrResult.data.text.trim().length > extractedText.trim().length) {
        console.log(`OCR successful for ${filePath}`);
        extractedText = ocrResult.data.text;
      }
    }

    return extractedText;
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    throw new Error('Failed to extract text from PDF');
  }
};

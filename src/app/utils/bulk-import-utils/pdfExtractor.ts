import fs from 'fs/promises';
const pdf = require('pdf-parse');

export const extractTextFromPdf = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    throw new Error('Failed to extract text from PDF');
  }
};

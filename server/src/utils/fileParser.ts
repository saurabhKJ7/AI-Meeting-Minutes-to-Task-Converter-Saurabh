import { Readable } from 'stream';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    
    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }
    
    throw new Error(`Unsupported file type: ${mimeType}`);
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}



/**
 * Utility functions for handling Arabic text encoding and display
 */

export const ensureArabicEncoding = (text: string): string => {
  if (!text) return '';
  
  try {
    // Check if text contains mojibake characters
    if (text.includes('��') || text.includes('Ø') || text.includes('Ù')) {
      // Try to decode from UTF-8 byte sequence
      const encoded = new TextEncoder().encode(text);
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(encoded);
      return decoded || text;
    }
    
    // Return original text if it appears to be properly encoded
    return text;
  } catch (error) {
    console.warn('Error processing Arabic text:', error);
    return text;
  }
};

export const isArabicText = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

export const formatArabicNumber = (number: number): string => {
  return number.toLocaleString('ar-EG');
};

export const getTextDirection = (text: string): 'ltr' | 'rtl' => {
  return isArabicText(text) ? 'rtl' : 'ltr';
};

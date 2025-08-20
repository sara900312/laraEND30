const fs = require('fs');

try {
  const zipBuffer = fs.readFileSync('./AA24.zip');
  
  // Function to extract a specific file from ZIP
  function extractFile(zipBuffer, targetPath) {
    // Find the central directory
    let centralDirOffset = -1;
    for (let i = zipBuffer.length - 22; i >= 0; i--) {
      if (zipBuffer[i] === 0x50 && zipBuffer[i+1] === 0x4B && 
          zipBuffer[i+2] === 0x05 && zipBuffer[i+3] === 0x06) {
        centralDirOffset = zipBuffer.readUInt32LE(i + 16);
        break;
      }
    }
    
    if (centralDirOffset < 0) return null;
    
    // Parse central directory to find the file
    let offset = centralDirOffset;
    while (offset < zipBuffer.length - 4) {
      if (zipBuffer[offset] === 0x50 && zipBuffer[offset+1] === 0x4B &&
          zipBuffer[offset+2] === 0x01 && zipBuffer[offset+3] === 0x02) {
        
        const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
        const extraFieldLength = zipBuffer.readUInt16LE(offset + 30);
        const commentLength = zipBuffer.readUInt16LE(offset + 32);
        const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);
        
        const fileName = zipBuffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);
        
        if (fileName === targetPath) {
          // Found the file, now extract it from local header
          const localOffset = localHeaderOffset;
          const localFileNameLength = zipBuffer.readUInt16LE(localOffset + 26);
          const localExtraFieldLength = zipBuffer.readUInt16LE(localOffset + 28);
          const compressedSize = zipBuffer.readUInt32LE(localOffset + 18);
          const compressionMethod = zipBuffer.readUInt16LE(localOffset + 8);
          
          const dataOffset = localOffset + 30 + localFileNameLength + localExtraFieldLength;
          
          if (compressionMethod === 0) {
            // No compression
            return zipBuffer.slice(dataOffset, dataOffset + compressedSize);
          } else {
            const zlib = require('zlib');
            try {
              return zlib.inflateRawSync(zipBuffer.slice(dataOffset, dataOffset + compressedSize));
            } catch (e) {
              console.log('Decompression failed for', targetPath, ':', e.message);
              return null;
            }
          }
        }
        
        offset += 46 + fileNameLength + extraFieldLength + commentLength;
      } else {
        break;
      }
    }
    
    return null;
  }
  
  // Create necessary directories
  fs.mkdirSync('./src/components/orders', { recursive: true });
  fs.mkdirSync('./src/utils', { recursive: true });
  
  // Files causing compilation errors
  const filesToExtract = [
    // Missing order components
    'AA24/src/components/orders/EnhancedOrderCard.tsx',
    'AA24/src/components/orders/OrderCard.tsx',
    'AA24/src/components/orders/OrderStatusDashboard.tsx',
    'AA24/src/components/orders/AutoAssignButton.tsx',
    
    // Missing utils
    'AA24/src/utils/errorHandling.ts',
    'AA24/src/utils/currencyUtils.ts',
    'AA24/src/utils/orderCalculations.ts'
  ];
  
  for (const filePath of filesToExtract) {
    const fileName = filePath.replace('AA24/', '');
    console.log(`Extracting ${fileName}...`);
    
    const buffer = extractFile(zipBuffer, filePath);
    if (buffer) {
      const content = buffer.toString('utf8');
      
      // Ensure directory exists
      const dir = require('path').dirname(fileName);
      fs.mkdirSync(dir, { recursive: true });
      
      fs.writeFileSync(`./${fileName}`, content);
      console.log(`✅ Extracted ${fileName}`);
    } else {
      console.log(`❌ Failed to extract ${fileName}`);
      
      // Create placeholder files for critical missing ones
      if (fileName === 'src/utils/currencyUtils.ts') {
        console.log('Creating placeholder currencyUtils...');
        fs.writeFileSync(`./${fileName}`, `
export const formatCurrency = (amount: number): string => {
  return \`\${amount.toLocaleString('ar-EG')} د.ع\`;
};

export const formatPriceWithDiscount = (price: number, discountedPrice?: number) => {
  if (discountedPrice && discountedPrice < price) {
    return {
      originalPrice: formatCurrency(price),
      discountedPrice: formatCurrency(discountedPrice),
      hasDiscount: true,
      savings: formatCurrency(price - discountedPrice)
    };
  }
  return {
    originalPrice: formatCurrency(price),
    hasDiscount: false
  };
};

export const formatProductPrice = formatPriceWithDiscount;

export const calculateDiscountPercentage = (original: number, discounted: number): number => {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
};

export const calculateFinalPrice = (originalPrice: number, discountedPrice?: number | null) => {
  const finalPrice = discountedPrice && discountedPrice > 0 ? discountedPrice : originalPrice;
  const hasDiscount = discountedPrice && discountedPrice > 0 && discountedPrice < originalPrice;
  const savings = hasDiscount ? originalPrice - finalPrice : 0;
  
  return {
    finalPrice,
    hasDiscount: Boolean(hasDiscount),
    savings,
    discountPercentage: hasDiscount ? calculateDiscountPercentage(originalPrice, finalPrice) : 0
  };
};
`);
      }
      
      if (fileName === 'src/utils/errorHandling.ts') {
        console.log('Creating placeholder errorHandling...');
        fs.writeFileSync(`./${fileName}`, `
export const handleError = (error: any, context?: string) => {
  console.error(\`Error in \${context || 'unknown context'}:\`, error);
  return {
    message: error?.message || 'حدث خطأ غير متوقع',
    details: error
  };
};

export const logError = (error: any, context?: string) => {
  console.error(\`[ERROR] \${context || 'Unknown'}:\`, error);
};

export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'حدث خطأ غير متوقع';
};
`);
      }
    }
  }
  
  console.log('\n✅ Compilation fixes extracted!');
  
} catch (error) {
  console.error('Error:', error.message);
}

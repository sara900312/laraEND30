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
            console.log('File is compressed, trying to decompress...');
            const zlib = require('zlib');
            try {
              return zlib.inflateRawSync(zipBuffer.slice(dataOffset, dataOffset + compressedSize));
            } catch (e) {
              console.log('Decompression failed:', e.message);
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
  
  // Extract package.json
  console.log('Extracting package.json...');
  const packageJsonBuffer = extractFile(zipBuffer, 'AA24/package.json');
  if (packageJsonBuffer) {
    const packageJsonContent = packageJsonBuffer.toString('utf8');
    console.log('✅ Extracted package.json:');
    console.log(packageJsonContent);
    
    fs.writeFileSync('./package.json', packageJsonContent);
    console.log('✅ Written package.json to current directory');
  } else {
    console.log('❌ Could not extract package.json');
  }
  
  // Extract vite.config.ts to understand the setup
  console.log('\nExtracting vite.config.ts...');
  const viteConfigBuffer = extractFile(zipBuffer, 'AA24/vite.config.ts');
  if (viteConfigBuffer) {
    const viteConfigContent = viteConfigBuffer.toString('utf8');
    console.log('✅ Extracted vite.config.ts:');
    console.log(viteConfigContent);
    
    fs.writeFileSync('./vite.config.ts', viteConfigContent);
    console.log('✅ Written vite.config.ts to current directory');
  }
  
  // Extract index.html
  console.log('\nExtracting index.html...');
  const indexHtmlBuffer = extractFile(zipBuffer, 'AA24/index.html');
  if (indexHtmlBuffer) {
    const indexHtmlContent = indexHtmlBuffer.toString('utf8');
    console.log('✅ Extracted index.html');
    
    fs.writeFileSync('./index.html', indexHtmlContent);
    console.log('✅ Written index.html to current directory');
  }
  
} catch (error) {
  console.error('Error:', error.message);
}

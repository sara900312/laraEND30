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
  fs.mkdirSync('./src/pages', { recursive: true });
  fs.mkdirSync('./src/components', { recursive: true });
  fs.mkdirSync('./src/lib', { recursive: true });
  fs.mkdirSync('./src/integrations', { recursive: true });
  
  // Essential missing files based on App.tsx imports
  const filesToExtract = [
    // Pages
    'AA24/src/pages/Index.tsx',
    'AA24/src/pages/NotFound.tsx',
    'AA24/src/pages/AdminLoginPage.tsx',
    'AA24/src/pages/AdminDashboard.tsx',
    'AA24/src/pages/StoreLoginPage.tsx',
    'AA24/src/pages/StoreDashboard.tsx',
    'AA24/src/pages/DebugPage.tsx',
    'AA24/src/pages/QuickDiagnostic.tsx',
    'AA24/src/pages/DataDiagnostic.tsx',
    'AA24/src/pages/TestEdgeFunctions.tsx',
    'AA24/src/pages/SimpleEdgeTest.tsx',
    'AA24/src/pages/ArabicTextTestPage.tsx',
    'AA24/src/pages/TestStoreCreator.tsx',
    'AA24/src/pages/TestOrderUpdate.tsx',
    'AA24/src/pages/TestEdgeFunctionFix.tsx',
    'AA24/src/pages/DatabaseSetup.tsx',
    
    // Essential lib files
    'AA24/src/lib/utils.ts',
    
    // Essential integrations
    'AA24/src/integrations/supabase/client.ts',
    'AA24/src/integrations/supabase/types.ts',
    
    // Components config
    'AA24/components.json'
  ];
  
  for (const filePath of filesToExtract) {
    const fileName = filePath.replace('AA24/', '');
    console.log(`Extracting ${fileName}...`);
    
    const buffer = extractFile(zipBuffer, filePath);
    if (buffer) {
      const content = buffer.toString('utf8');
      fs.writeFileSync(`./${fileName}`, content);
      console.log(`✅ Extracted ${fileName}`);
    } else {
      console.log(`❌ Failed to extract ${fileName}`);
    }
  }
  
  console.log('\n✅ Essential missing files extracted!');
  
} catch (error) {
  console.error('Error:', error.message);
}

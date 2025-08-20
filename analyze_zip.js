const fs = require('fs');

try {
  const zipBuffer = fs.readFileSync('./AA24.zip');
  console.log('Analyzing ZIP file...');
  
  // Check if this is a proper ZIP file
  if (zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4B) {
    console.log('✅ Valid ZIP file signature found');
    
    // Look for central directory
    let centralDirOffset = -1;
    for (let i = zipBuffer.length - 22; i >= 0; i--) {
      if (zipBuffer[i] === 0x50 && zipBuffer[i+1] === 0x4B && 
          zipBuffer[i+2] === 0x05 && zipBuffer[i+3] === 0x06) {
        centralDirOffset = zipBuffer.readUInt32LE(i + 16);
        console.log('Found central directory at offset:', centralDirOffset);
        break;
      }
    }
    
    if (centralDirOffset >= 0) {
      // Parse central directory entries
      let offset = centralDirOffset;
      const files = [];
      
      while (offset < zipBuffer.length - 4) {
        if (zipBuffer[offset] === 0x50 && zipBuffer[offset+1] === 0x4B &&
            zipBuffer[offset+2] === 0x01 && zipBuffer[offset+3] === 0x02) {
          
          const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
          const extraFieldLength = zipBuffer.readUInt16LE(offset + 30);
          const commentLength = zipBuffer.readUInt16LE(offset + 32);
          
          const fileName = zipBuffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);
          files.push(fileName);
          
          offset += 46 + fileNameLength + extraFieldLength + commentLength;
        } else {
          break;
        }
      }
      
      console.log('Files in ZIP:');
      files.forEach(file => console.log(' -', file));
      
      // Look for package.json or similar files
      const packageFile = files.find(f => f.includes('package.json'));
      const indexFile = files.find(f => f.includes('index.') && (f.includes('.js') || f.includes('.html')));
      const srcFiles = files.filter(f => f.includes('src/') || f.includes('.js') || f.includes('.jsx') || f.includes('.ts') || f.includes('.tsx'));
      
      console.log('\nKey files found:');
      if (packageFile) console.log('📦 Package file:', packageFile);
      if (indexFile) console.log('🏠 Index file:', indexFile);
      if (srcFiles.length > 0) console.log('📁 Source files:', srcFiles.slice(0, 5));
      
      // Create a basic package.json if none exists
      if (!packageFile) {
        console.log('\n🔧 Creating basic package.json...');
        const basicPackageJson = {
          "name": "extracted-project",
          "version": "1.0.0",
          "main": indexFile || "index.js",
          "scripts": {
            "dev": "npm run start",
            "start": "node " + (indexFile || "index.js"),
            "build": "echo 'No build script defined'"
          },
          "dependencies": {}
        };
        
        // Try to detect framework based on files
        if (files.some(f => f.includes('vite') || f.includes('vite.'))) {
          basicPackageJson.scripts.dev = "vite";
          basicPackageJson.scripts.build = "vite build";
          basicPackageJson.scripts.preview = "vite preview";
          basicPackageJson.devDependencies = { "vite": "^5.0.0" };
        } else if (files.some(f => f.includes('next') || f.includes('Next'))) {
          basicPackageJson.scripts.dev = "next dev";
          basicPackageJson.scripts.build = "next build";
          basicPackageJson.scripts.start = "next start";
          basicPackageJson.dependencies = { "next": "^14.0.0", "react": "^18.0.0", "react-dom": "^18.0.0" };
        } else if (files.some(f => f.includes('webpack') || f.includes('react'))) {
          basicPackageJson.scripts.dev = "react-scripts start";
          basicPackageJson.scripts.build = "react-scripts build";
          basicPackageJson.dependencies = { "react": "^18.0.0", "react-dom": "^18.0.0", "react-scripts": "^5.0.0" };
        }
        
        fs.writeFileSync('./package.json', JSON.stringify(basicPackageJson, null, 2));
        console.log('✅ Created package.json:', basicPackageJson.name);
      }
      
    } else {
      console.log('❌ Could not find central directory');
    }
    
  } else {
    console.log('❌ Not a valid ZIP file');
    // Try to see if it's some other format
    const header = zipBuffer.toString('ascii', 0, 50);
    console.log('File header:', header);
  }
  
} catch (error) {
  console.error('Error:', error.message);
}

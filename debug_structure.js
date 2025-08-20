const fs = require('fs');
const path = require('path');

console.log('Current working directory files:');
try {
  const files = fs.readdirSync('./');
  files.forEach(file => {
    const stats = fs.statSync(file);
    console.log(`${stats.isDirectory() ? 'DIR' : 'FILE'}: ${file}`);
    
    if (stats.isDirectory()) {
      try {
        const subFiles = fs.readdirSync(file);
        subFiles.forEach(subFile => {
          const subStats = fs.statSync(path.join(file, subFile));
          console.log(`  ${subStats.isDirectory() ? 'DIR' : 'FILE'}: ${subFile}`);
        });
      } catch (e) {
        console.log(`  Error reading ${file}: ${e.message}`);
      }
    }
  });
} catch (error) {
  console.error('Error reading directory:', error.message);
}

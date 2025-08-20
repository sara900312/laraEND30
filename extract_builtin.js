const fs = require('fs');

// Read the zip file and extract package.json
try {
  const zipBuffer = fs.readFileSync('./AA24.zip');
  console.log('ZIP file size:', zipBuffer.length);
  
  // Convert to string to search for content
  const zipString = zipBuffer.toString('latin1');
  
  // Look for package.json content - more flexible pattern
  const packageJsonMatches = zipString.match(/package\.json[\s\S]*?({[\s\S]*?"name"[\s\S]*?})/g);
  
  if (packageJsonMatches && packageJsonMatches.length > 0) {
    console.log('Found package.json matches:', packageJsonMatches.length);
    
    for (let i = 0; i < packageJsonMatches.length; i++) {
      const match = packageJsonMatches[i];
      const jsonMatch = match.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        try {
          const packageJson = JSON.parse(jsonMatch[0]);
          console.log(`Package.json ${i + 1}:`, JSON.stringify(packageJson, null, 2));
          
          // Write the first valid package.json
          fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
          console.log('✅ Written package.json to current directory');
          break;
        } catch (e) {
          console.log(`Could not parse package.json ${i + 1}:`, e.message);
          // Try to clean up the JSON
          let cleanJson = jsonMatch[0];
          cleanJson = cleanJson.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
          cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
          
          try {
            const packageJson = JSON.parse(cleanJson);
            console.log(`Cleaned package.json ${i + 1}:`, JSON.stringify(packageJson, null, 2));
            fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
            console.log('✅ Written cleaned package.json to current directory');
            break;
          } catch (e2) {
            console.log(`Still could not parse cleaned package.json ${i + 1}:`, e2.message);
          }
        }
      }
    }
  } else {
    console.log('No package.json found in zip');
    
    // Try alternative search patterns
    const altMatches = zipString.match(/"name"\s*:\s*"[^"]*"/g);
    if (altMatches) {
      console.log('Found name fields:', altMatches);
    }
  }
  
} catch (error) {
  console.error('Error processing ZIP file:', error.message);
}

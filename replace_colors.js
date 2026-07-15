const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const original = content;
      content = content.replace(/1a4b9c/g, '4d3227'); // Primary blue -> Primary brown
      content = content.replace(/153a7a/g, '3a251d'); // Hover blue -> Hover brown
      content = content.replace(/4b6bb3/g, '5c3e31'); // Lighter blue -> Lighter brown
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'src', 'pages', 'pos'));
replaceInDir(path.join(__dirname, 'src', 'pages', 'admin'));
replaceInDir(path.join(__dirname, 'src', 'components'));
replaceInDir(path.join(__dirname, 'src', 'layouts'));
console.log('Done replacing colors.');

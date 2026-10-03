const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getFiles(fullPath, files);
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

const appDir = path.join(__dirname, '..', 'app');
const files = getFiles(appDir);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('fixed') && line.includes('inset-0') && (line.includes('bg-black') || line.includes('backdrop-blur') || line.includes('z-50'))) {
      console.log(`${path.relative(path.join(__dirname, '..'), file)}:L${idx + 1}: ${line.trim()}`);
    }
  });
});

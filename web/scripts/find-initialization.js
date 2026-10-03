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
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

const appDir = path.join(__dirname, '..');
const files = [];

function searchDir(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== 'scripts') {
        searchDir(fullPath);
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  }
}
searchDir(appDir);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('obtenerDb') || content.includes("from '@/db/")) {
    console.log(`Found in: ${path.relative(path.join(__dirname, '..'), file)}`);
  }
});

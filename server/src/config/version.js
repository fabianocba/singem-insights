const fs = require('node:fs');
const path = require('node:path');

function readVersion() {
  const candidatePaths = [
    path.resolve(__dirname, '../../../version.json'),
    path.resolve(process.cwd(), 'version.json'),
    path.resolve(process.cwd(), '../version.json')
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  }

  throw new Error('version.json não encontrado');
}

module.exports = {
  readVersion
};

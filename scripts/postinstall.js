const fs = require('fs');
const path = require('path');

try {
  // If running on Linux/Unix (like Render / cloud containers)
  if (process.platform !== 'win32') {
    const nodeBinDir = path.dirname(process.execPath);
    const targetNpn = path.join(nodeBinDir, 'npn');
    const scriptContent = '#!/usr/bin/env bash\nexec node "' + path.resolve(__dirname, '../server.js') + '" "$@"\n';
    try {
      fs.writeFileSync(targetNpn, scriptContent, { mode: 0o755 });
      console.log('✓ Created npn wrapper in ' + targetNpn);
    } catch (e) {
      // If node directory is read-only, create in local node_modules/.bin
      const localBin = path.resolve(__dirname, '../node_modules/.bin');
      if (!fs.existsSync(localBin)) fs.mkdirSync(localBin, { recursive: true });
      fs.writeFileSync(path.join(localBin, 'npn'), scriptContent, { mode: 0o755 });
      console.log('✓ Created npn wrapper in local node_modules/.bin');
    }
  }
} catch (err) {
  console.warn('Postinstall warning (non-fatal):', err.message);
}


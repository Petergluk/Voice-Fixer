const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

function createZip(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    console.log(`Creating ${outPath} from ${sourceDir}...`);
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        console.log(`Successfully created ${outPath} (${archive.pointer()} bytes)`);
        resolve();
    });
    
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.warn(err);
      } else {
        reject(err);
      }
    });

    archive.on('error', err => reject(err));

    archive.pipe(output);
    
    // zip the contents of the directory, not the directory itself
    archive.directory(sourceDir, false);
    
    archive.finalize();
  });
}

(async () => {
    try {
        if (!fs.existsSync('DISTR')) {
            fs.mkdirSync('DISTR', { recursive: true });
        }
        await createZip(path.join(__dirname, 'chrome-extension'), path.join(__dirname, 'DISTR/chrome-extension.zip'));
        await createZip(path.join(__dirname, 'src/plugins/voice-fixer'), path.join(__dirname, 'DISTR/puunote-voice-fixer-plugin.zip'));
        console.log('All zips created successfully!');
    } catch (e) {
        console.error('Failed to create zips:', e);
        process.exit(1);
    }
})();

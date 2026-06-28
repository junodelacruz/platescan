const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const templatePath = path.join(__dirname, '..', 'web', 'public', 'index.html');
const outputPath = path.join(distDir, 'index.html');

// Find the actual bundle file
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
const files = fs.readdirSync(jsDir);
const jsBundle = files.find(f => f.endsWith('.js'));

if (!jsBundle) {
  console.error('ERROR: No JS bundle found in', jsDir);
  process.exit(1);
}

// Read template
let html = fs.readFileSync(templatePath, 'utf8');

// Inject script tag before </body>
const scriptTag = `  <script src="/_expo/static/js/web/${jsBundle}" defer></script>`;
html = html.replace('</body>', `${scriptTag}\n  </body>`);

// Write patched index.html
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`Patched dist/index.html with bundle: ${jsBundle}`);

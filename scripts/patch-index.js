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

// 1. INJECT THE CRITICAL PWA METADATA TAGS
const pwaMetaTags = `
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style">
`;
html = html.replace('</head>', `${pwaMetaTags}\n</head>`);

// 2. FORCE NATIVE LAYOUT ENGINE DEEPER THAN THE INJECTED FRAMEWORK DIVS
const layoutOverrides = `
  <style>
    /* Force the main engine window to absorb the top status bar */
    html {
      height: calc(100% + env(safe-area-inset-top)) !important;
      background-color: transparent !important;
    }

    /* Target EVERY major parent container React Native Web auto-injects */
    body, #root, [data-contents="true"], .css-view-175oi2r {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: -env(safe-area-inset-top) !important;
      height: calc(100% + env(safe-area-inset-top)) !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    /* Force your primary screens to bypass internal flex-box boundaries */
    #root > div {
      margin-top: 0 !important;
      padding-top: 0 !important;
      top: 0 !important;
      position: absolute !important;
      height: 100% !important;
      width: 100% !important;
    }
  </style>
`;
html = html.replace('</head>', `${layoutOverrides}\n</head>`);

// Inject script tag before </body>
const scriptTag = `  <script src="/_expo/static/js/web/${jsBundle}" defer></script>`;
html = html.replace('</body>', `${scriptTag}\n  </body>`);

// Write patched index.html
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`Patched dist/index.html with absolute root-pulling styles: ${jsBundle}`);

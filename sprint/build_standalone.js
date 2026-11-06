const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');
const threeJs = fs.readFileSync(path.join(__dirname, 'lib', 'three.min.js'), 'utf8');

const jsFiles = [
  'storage.js',
  'audio.js',
  'missions.js',
  'input.js',
  'player.js',
  'chaser.js',
  'collectibles.js',
  'world.js',
  'ui.js',
  'main.js'
];

let combinedJs = '';
jsFiles.forEach(file => {
  const filePath = path.join(__dirname, 'js', file);
  combinedJs += `\n/* === ${file} === */\n` + fs.readFileSync(filePath, 'utf8') + '\n';
});

let standaloneHtml = htmlContent;

// Replace stylesheet link with inline style
standaloneHtml = standaloneHtml.replace(
  /<link rel="stylesheet" href="css\/style\.css[^"]*">/i,
  `<style>\n${cssContent}\n</style>`
);

// Replace external Three.js script with inline Three.js
standaloneHtml = standaloneHtml.replace(
  /<script src="lib\/three\.min\.js"><\/script>/i,
  `<script>\n${threeJs}\n</script>`
);

// Remove individual modular script tags
jsFiles.forEach(file => {
  standaloneHtml = standaloneHtml.replace(
    new RegExp(`<script src="js\\/${file}(\\?[^"]*)?"><\\/script>\\s*`, 'gi'),
    ''
  );
});

// Inject combined inline game scripts before </body>
standaloneHtml = standaloneHtml.replace(
  '</body>',
  `<script>\n${combinedJs}\n</script>\n</body>`
);

fs.writeFileSync(path.join(__dirname, 'Saurabhs_Sprint_Standalone.html'), standaloneHtml, 'utf8');
console.log('Successfully generated Saurabhs_Sprint_Standalone.html (100% Single-File Serverless Standalone Edition)');

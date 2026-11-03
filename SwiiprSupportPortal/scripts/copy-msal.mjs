import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('wwwroot/lib', { recursive: true });
copyFileSync('node_modules/@azure/msal-browser/lib/msal-browser.min.js', 'wwwroot/lib/msal-browser.min.js');
console.log('Copied msal-browser.min.js to wwwroot/lib');

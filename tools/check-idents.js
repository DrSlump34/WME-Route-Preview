// Toute fonction appelée dans le script doit y être déclarée.
// node --check ne voit pas une fonction disparue : le script compile, puis meurt au
// démarrage sur une ReferenceError, sans rien poser à l'écran.
// Usage : node tools/check-idents.js [fichier]
const fs = require('fs');
const path = require('path');
const f = process.argv[2] || path.join(__dirname, '..', 'WME-Route-Preview.user.js');
const brut = fs.readFileSync(f, 'utf8');

// Ne garde que le CODE : chaînes, textes des gabarits et commentaires sont remplacés par des
// blancs ; les expressions ${…} des gabarits restent, puisqu'elles s'exécutent.
function codeSeul(s) {
    let out = '', i = 0;
    const pile = [];              // profondeur d'accolades de chaque ${ ouvert
    let etat = 'code';
    while (i < s.length) {
        const c = s[i], d = s[i + 1];
        if (etat === 'code') {
            if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
            if (c === '/' && d === '*') { i = s.indexOf('*/', i + 2); i = i < 0 ? s.length : i + 2; out += ' '; continue; }
            if (c === "'" || c === '"') { const q = c; i++; while (i < s.length && s[i] !== q) i += s[i] === '\\' ? 2 : 1; i++; out += "''"; continue; }
            if (c === '`') { etat = 'gabarit'; i++; out += ' '; continue; }
            if (c === '{' && pile.length) pile[pile.length - 1]++;
            if (c === '}' && pile.length) {
                if (pile[pile.length - 1] === 0) { pile.pop(); etat = 'gabarit'; i++; out += ' '; continue; }
                pile[pile.length - 1]--;
            }
            out += c; i++; continue;
        }
        // gabarit
        if (c === '\\') { i += 2; continue; }
        if (c === '`') { etat = 'code'; i++; out += ' '; continue; }
        if (c === '$' && d === '{') { pile.push(0); etat = 'code'; i += 2; out += ' '; continue; }
        i++;
    }
    return out;
}

const src = codeSeul(brut);
const declares = new Set();
for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) declares.add(m[1]);
for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) declares.add(m[1]);
// Paramètres : ceux des fonctions nommées et ceux des fonctions fléchées.
const params = liste => liste.split(',').map(x => x.trim().replace(/=.*$/, '').replace(/[{}[\]\s.]/g, '')).filter(Boolean);
for (const m of src.matchAll(/\bfunction\s*[\w$]*\s*\(([^)]*)\)/g)) params(m[1]).forEach(x => declares.add(x));
for (const m of src.matchAll(/\(([^()]*)\)\s*=>/g)) params(m[1]).forEach(x => declares.add(x));
for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) declares.add(m[1]);
const natifs = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'fetch',
    'requestAnimationFrame', 'parseInt', 'parseFloat', 'String', 'Number', 'Boolean', 'Object', 'Array', 'JSON', 'Math',
    'Map', 'Set', 'Promise', 'Audio', 'GM_xmlhttpRequest', 'MutationObserver', 'Error', 'isNaN', 'encodeURIComponent', 'await', 'async']);
const absents = new Set();
for (const m of src.matchAll(/(^|[^.\w$])([a-zA-Z_$][\w$]*)\s*\(/g)) {
    const n = m[2];
    if (!declares.has(n) && !natifs.has(n)) absents.add(n);
}
if (absents.size) { console.error('APPELÉES MAIS NON DÉCLARÉES : ' + [...absents].join(', ')); process.exit(1); }
console.log('OK — ' + declares.size + ' déclarations, aucun appel orphelin');

// Toute fonction appelée dans le script doit y être déclarée.
// node --check ne voit pas une fonction disparue : le script compile, puis meurt au
// démarrage sur une ReferenceError, sans rien poser à l'écran.
// Corrigé le 28/09/2026, repris de WME BAN Coverage (26/09) : un appel derrière un étalement
// (...nom() ) était pris pour une méthode x.nom() et échappait au contrôle ; chaque nom signalé
// porte maintenant sa ligne, juste (les sauts de ligne des commentaires /* */ et des gabarits
// sont gardés). tools/temoins-idents.js prouve ces deux cas, à la bonne ligne.
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
            // Les sauts de ligne sont GARDÉS (commentaires multilignes, texte des gabarits) : sans eux,
            // les numéros de ligne signalés dériveraient (audit WBC du 26/09).
            if (c === '/' && d === '*') { const j = s.indexOf('*/', i + 2), f = j < 0 ? s.length : j + 2; out += ' ' + s.slice(i, f).replace(/[^\n]/g, ''); i = f; continue; }
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
        if (c === '\n') out += '\n';
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
    'Map', 'Set', 'Promise', 'Audio', 'GM_xmlhttpRequest', 'MutationObserver', 'Error', 'isNaN', 'encodeURIComponent', 'await', 'async', 'URL', 'URLSearchParams']);
const absents = new Map();        // nom -> ligne du premier appel
// Un nom précédé d'un point est une méthode (x.nom(), x?.nom()) — mais PAS derrière l'étalement
// ...nom(), qui appelle une fonction : le prendre pour une méthode laissait passer
// [...fonctionDisparue(x)] (vu le 26/09 en mutant WBC).
for (const m of src.matchAll(/(^|[^.\w$]|\.\.\.)([a-zA-Z_$][\w$]*)\s*\(/g)) {
    const n = m[2];
    if (!declares.has(n) && !natifs.has(n) && !absents.has(n)) absents.set(n, src.slice(0, m.index + m[1].length).split('\n').length);
}
if (absents.size) { console.error('APPELÉES MAIS NON DÉCLARÉES : ' + [...absents].map(([n, l]) => n + ' (~l. ' + l + ')').join(', ')); process.exit(1); }
console.log('OK — ' + declares.size + ' déclarations, aucun appel orphelin');

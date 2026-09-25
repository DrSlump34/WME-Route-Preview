// Banc de non-régression : rejoue les trajets enregistrés (bancs/*.json) sur le script LIVRÉ, tel quel,
// sans WME ni navigateur, et compare ce qu'il affiche et dit à la référence (bancs/attendu/*.json).
//
//   node tools/rejouer-bancs.js            compare ; code de sortie 1 au moindre écart
//   node tools/rejouer-bancs.js --maj      réécrit la référence (après avoir VÉRIFIÉ que l'écart est voulu)
//
// Le fichier livré n'est pas modifié : on l'évalue dans un bac à sable (vm) où `sdk` reste null — tout ce
// qui dépend des données chargées dans WME (virages, voies, écussons locaux) est donc absent, et c'est ce
// qu'on veut : le banc mesure ce que le SCRIPT fait de la réponse du serveur. Pour atteindre les fonctions
// internes, une ligne est ajoutée EN MÉMOIRE juste avant `const init` (jamais écrite sur disque).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.join(__dirname, '..');
// WRP_SCRIPT=chemin : rejouer une autre version (pour vérifier que le banc MORD sur un défaut connu).
const SCRIPT = process.env.WRP_SCRIPT || path.join(RACINE, 'WME-Route-Preview.user.js');
const BANCS = path.join(RACINE, 'bancs');
const ATTENDU = path.join(BANCS, 'attendu');
const MAJ = process.argv.includes('--maj');

function charger() {
    let code = fs.readFileSync(SCRIPT, 'utf8');
    const ancre = '    const init = async () => {';
    if (!code.includes(ancre)) throw new Error('ancre « const init » introuvable : le banc doit être adapté');
    code = code.replace(ancre, '    globalThis.__wrp = { analyser, lignes, texteAnnonce, verbe, dureeTexte, distAppli, ' +
        'setLang: l => { _lang = l; }, setTrajet: v => { trajet = v; }, setVoix: v => { opts.voix = v; } };\n' + ancre);
    const bac = {
        console: { log() { }, warn() { }, error() { } },
        document: { addEventListener() { }, documentElement: { lang: 'fr' } },
        navigator: { language: 'fr' },
        setTimeout, clearTimeout, setInterval() { }, Intl, URL,
    };
    bac.window = bac;
    vm.createContext(bac);
    vm.runInContext(code, bac, { filename: 'WME-Route-Preview.user.js' });
    return bac.__wrp;
}

// Une ligne affichée, réduite à son texte : les images d'écusson deviennent [texte].
const texte = html => String(html || '').replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '[$1]').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

function rejouer(api, banc) {
    const j = JSON.parse(fs.readFileSync(path.join(BANCS, banc), 'utf8'));
    api.setLang('fr');
    api.setVoix('fr-FR');
    const tr = api.analyser(j);
    api.setTrajet(tr);
    return {
        metres: tr.metres,
        duree: api.dureeTexte(tr.secondes),
        manoeuvres: tr.manoeuvres.map((m, i) => {
            const L = api.lignes(m, 18, true);
            return {
                n: i + 1, op: m.op, arg: m.arg || 0, troncon: api.distAppli(m.troncon), rue: m.rue || '',
                l1: texte(L.l1), l2: texte(L.l2), sorties: texte(L.sorties),
                annonces: tr.annonces.filter(a => a.k === i).map(a => (a.d ? a.d + ' m : ' : 'final : ') + api.texteAnnonce(a)),
            };
        }),
    };
}

function comparer(a, b, chemin, ecarts) {
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) { ecarts.push(chemin + ' : ' + JSON.stringify(b) + ' → ' + JSON.stringify(a)); return; }
    if (a && typeof a === 'object') {
        const cles = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const k of cles) comparer(a[k], b[k], chemin + '.' + k, ecarts);
        return;
    }
    if (a !== b) ecarts.push(chemin + ' : ' + JSON.stringify(b) + ' → ' + JSON.stringify(a));
}

const api = charger();
const bancs = fs.readdirSync(BANCS).filter(f => f.endsWith('.json')).sort();
if (!fs.existsSync(ATTENDU)) fs.mkdirSync(ATTENDU);
let total = 0;
for (const b of bancs) {
    const obtenu = rejouer(api, b);
    const fichier = path.join(ATTENDU, b);
    if (MAJ || !fs.existsSync(fichier)) {
        fs.writeFileSync(fichier, JSON.stringify(obtenu, null, 1) + '\n');
        console.log('référence écrite : ' + b + ' (' + obtenu.manoeuvres.length + ' manœuvres)');
        continue;
    }
    const ecarts = [];
    comparer(obtenu, JSON.parse(fs.readFileSync(fichier, 'utf8')), b, ecarts);
    total += ecarts.length;
    console.log((ecarts.length ? 'ÉCART  ' : 'OK     ') + b + (ecarts.length ? ' — ' + ecarts.length + ' écart(s)' : ''));
    ecarts.slice(0, 20).forEach(e => console.log('   ' + e));
}
if (total) { console.log(total + ' écart(s) au total'); process.exit(1); }

// Banc des fonctions de la 0.15 : itinéraires alternatifs, comparaison à une référence, virage testé.
// Même principe que rejouer-bancs.js : le script LIVRÉ est évalué tel quel dans un bac à sable (sdk nul),
// une ligne ajoutée EN MÉMOIRE avant `const init` donne accès aux fonctions internes.
//
//   node tools/banc-nouveautes.js                 code de sortie 1 au moindre cas faux
//   WRP_SCRIPT=chemin node tools/banc-nouveautes.js   rejouer une autre version (témoin : le banc doit MORDRE)
//
// Réponse réelle du 27/09/2026 : Uzès → Nîmes demandé avec nPaths=3 (bancs/trajet_uzes_nimes_alternatives.json).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.join(__dirname, '..');
const SCRIPT = process.env.WRP_SCRIPT || path.join(RACINE, 'WME-Route-Preview.user.js');
const BANC = path.join(RACINE, 'bancs', 'trajet_uzes_nimes_alternatives.json');

function charger() {
    let code = fs.readFileSync(SCRIPT, 'utf8');
    const ancre = '    const init = async () => {';
    if (!code.includes(ancre)) throw new Error('ancre « const init » introuvable');
    code = code.replace(ancre, '    globalThis.__wrp = { analyserTous, empreinte, comparerAvec, verdictVirage, ' +
        'setLang: l => { _lang = l; }, setVirage: v => { virageTeste = v; } };\n' + ancre);
    const bac = {
        console: { log() { }, warn() { }, error() { } },
        document: { addEventListener() { }, documentElement: { lang: 'fr' } },
        navigator: { language: 'fr' },
        setTimeout, clearTimeout, setInterval() { }, Intl, URL, URLSearchParams,
    };
    bac.window = bac;
    vm.createContext(bac);
    vm.runInContext(code, bac, { filename: 'WME-Route-Preview.user.js' });
    return bac.__wrp;
}

let fautes = 0;
const cas = (nom, ok, detail) => { console.log((ok ? 'OK     ' : 'FAUX   ') + nom + (ok ? '' : ' — ' + detail)); if (!ok) fautes++; };

let api;
try { api = charger(); } catch (e) { console.log('FAUX   chargement — ' + e.message); process.exit(1); }
if (!api || !api.analyserTous) { console.log('FAUX   fonctions absentes du script'); process.exit(1); }
api.setLang('fr');
const j = JSON.parse(fs.readFileSync(BANC, 'utf8'));

// ---- Itinéraires : tous lus, dans l'ordre du serveur
const tous = api.analyserTous(j);
cas('4 itinéraires lus', tous.length === 4, tous.length + ' lus');
cas('ordre du serveur gardé (1er = Route d’Uzès Nîmes)', tous[0] && tous[0].fiche.via === 'Route d\'Uzès Nîmes', tous[0] && tous[0].fiche.via);
cas('chacun a son tracé', tous.every(x => x.coords.length > 100), tous.map(x => x.coords.length).join('/'));
cas('durées distinctes', new Set(tous.map(x => x.secondes)).size === 4, tous.map(x => x.secondes).join('/'));

// ---- Comparaison : un trajet comparé à lui-même est identique ; chaque champ modifié est vu
const tr = tous[0];
const ref = { l: api.empreinte(tr), o: {} };
const c0 = api.comparerAvec(ref, tr);
cas('identique à lui-même', c0.lignes.every(l => l.etat === 'identique') && !c0.disparues.length,
    c0.lignes.filter(l => l.etat !== 'identique').length + ' lignes différentes, ' + c0.disparues.length + ' disparues');

const k = 3;                                          // une ligne quelconque du milieu
const avec = (champ, val) => { const r = { l: api.empreinte(tr), o: {} }; r.l[k][champ] = val; return api.comparerAvec(r, tr).lignes[k]; };
for (const [champ, val] of [['op', 'UTURN'], ['txt', 'Autre rue'], ['voies', '0*|-45'], ['perso', true], ['tts', 'Tournez vers Nîmes']]) {
    const l = avec(champ, val);
    cas('écart vu : ' + champ, l.etat === 'modifiee' && l.ecarts.includes(champ), JSON.stringify(l));
}
const sansUne = { l: api.empreinte(tr).filter((x, n) => n !== k), o: {} };
const c1 = api.comparerAvec(sansUne, tr);
cas('ligne absente de la référence = nouvelle', c1.lignes[k].etat === 'nouvelle' && c1.lignes.filter(l => l.etat !== 'identique').length === 1,
    c1.lignes.map(l => l.etat[0]).join(''));
const enPlus = { l: api.empreinte(tr).concat([{ op: 'TURN_LEFT', arg: 0, lon: 4.0, lat: 44.5, txt: 'Nulle part', voies: '', perso: false, tts: '' }]), o: {} };
const c2 = api.comparerAvec(enPlus, tr);
cas('ligne de la référence absente = disparue', c2.disparues.length === 1 && c2.disparues[0].txt === 'Nulle part', c2.disparues.length + ' disparues');
// Un autre itinéraire ne passe pas pour le même : beaucoup de lignes nouvelles ou disparues.
const c3 = api.comparerAvec(ref, tous[1]);
cas('autre itinéraire ≠ référence', c3.disparues.length + c3.lignes.filter(l => l.etat === 'nouvelle').length > 5,
    c3.disparues.length + ' disparues');

// ---- Virage testé : pris avec instruction, pris sans, non pris
const R = tr.R, seg = i => R[i].path.segmentId;
const iTourne = R.findIndex((x, i) => i + 1 < R.length && x.instruction && x.instruction.opcode === 'TURN_LEFT' && i > 0);
api.setVirage({ de: seg(iTourne), vers: seg(iTourne + 1) });
let v = api.verdictVirage(tr);
const kAttendu = tr.manoeuvres.findIndex(m => m.i === iTourne);
cas('virage pris, avec son instruction', v && v.passe && v.k === kAttendu && kAttendu >= 0, JSON.stringify(v) + ' attendu k=' + kAttendu);
const iMuet = R.findIndex((x, i) => i > 0 && i + 1 < R.length && !(x.instruction && x.instruction.opcode && x.instruction.opcode !== 'NONE'));
api.setVirage({ de: seg(iMuet), vers: seg(iMuet + 1) });
v = api.verdictVirage(tr);
cas('virage pris sans instruction', v && v.passe && v.k === -1, JSON.stringify(v));
api.setVirage({ de: seg(iMuet + 1), vers: seg(iMuet) });
v = api.verdictVirage(tr);
cas('virage à rebours : non pris', v && !v.passe, JSON.stringify(v));
api.setVirage(null);
cas('sans virage testé : rien', api.verdictVirage(tr) === null, 'verdict rendu');

if (fautes) { console.log(fautes + ' cas faux'); process.exit(1); }
console.log('Tous les cas passent.');

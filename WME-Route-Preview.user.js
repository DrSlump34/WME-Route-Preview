// ==UserScript==
// @name         WME Route Preview
// @name:fr      WME Route Preview
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2NCcgaGVpZ2h0PSc2NCcgdmlld0JveD0nMCAwIDY0IDY0Jz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB5MT0nMCcgeDI9JzAnIHkyPScxJz48c3RvcCBvZmZzZXQ9JzAnIHN0b3AtY29sb3I9JyMxZTliZjAnLz48c3RvcCBvZmZzZXQ9JzEnIHN0b3AtY29sb3I9JyMxNTY1YzAnLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0nNjQnIGhlaWdodD0nNjQnIHJ4PScxNCcgZmlsbD0ndXJsKCNnKScvPjxwYXRoIGQ9J00xNSA1NSBWMzQgUTE1IDI1IDI0IDI1IEgzMScgZmlsbD0nbm9uZScgc3Ryb2tlPScjZmZmJyBzdHJva2Utd2lkdGg9JzknIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcgc3Ryb2tlLWxpbmVqb2luPSdyb3VuZCcvPjxwYXRoIGQ9J00yOSAxMyBMNDMgMjUgTDI5IDM3IFonIGZpbGw9JyNmZmYnIHN0cm9rZT0nI2ZmZicgc3Ryb2tlLXdpZHRoPSczJyBzdHJva2UtbGluZWpvaW49J3JvdW5kJy8+PHBhdGggZD0nTTM3IDQ3IEg0MiBMNTAgNDAgVjYwIEw0MiA1MyBIMzcgWicgZmlsbD0nI2ZiOGMwMCcgc3Ryb2tlPScjZmI4YzAwJyBzdHJva2Utd2lkdGg9JzEuNScgc3Ryb2tlLWxpbmVqb2luPSdyb3VuZCcvPjxwYXRoIGQ9J001NCA0NCBRNTcuNSA1MCA1NCA1NicgZmlsbD0nbm9uZScgc3Ryb2tlPScjZmI4YzAwJyBzdHJva2Utd2lkdGg9JzMnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPjwvc3ZnPgo=
// @namespace    https://github.com/DrSlump34
// @version      0.15.03
// @description  Preview a route in WME the way the Waze app gives it: set a start and a finish (segment, place, search or pointer), then read every instruction as in the app list — road shields, exit signs, lanes, roundabouts — and hear every voice prompt spoken by the real Waze voice, including the custom turn guidance set by editors. Route options as in the app (time, vehicle, avoidances, passes). The script never changes the map.
// @description:fr Prévisualiser un trajet dans WME comme l'appli Waze le donne : posez un départ et une arrivée (segment, lieu, recherche ou pointeur), puis lisez chaque instruction comme dans la liste de l'appli — écussons, panneaux de sortie, voies, ronds-points — et écoutez chaque annonce dite par la vraie voix de Waze, y compris les instructions personnalisées posées par les éditeurs. Options du calcul comme dans l'appli (heure, véhicule, évitements, pass). Le script ne modifie jamais la carte.
// @author       DrSlump34
// @copyright    DrSlump34 2026
// @license      MIT
// @homepageURL  https://github.com/DrSlump34/WME-Route-Preview
// @supportURL   https://github.com/DrSlump34/WME-Route-Preview/issues
// @downloadURL  https://update.greasyfork.org/scripts/597359/WME%20Route%20Preview.user.js
// @updateURL    https://update.greasyfork.org/scripts/597359/WME%20Route%20Preview.meta.js
// @match        https://www.waze.com/*/editor*
// @match        https://www.waze.com/editor*
// @match        https://beta.waze.com/*/editor*
// @match        https://beta.waze.com/editor*
// @exclude      https://www.waze.com/*user/*editor/*
// @exclude      https://www.waze.com/discuss/*
// @exclude      https://www.waze.com/editor/sdk/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      waze.com
// @connect      raw.githubusercontent.com
// @connect      update.greasyfork.org
// @run-at       document-idle
// ==/UserScript==

/*  Le calcul d'itinéraire est celui de la Live Map (routing-livemap-*.waze.com) : WME en bloque
 *  l'appel direct, d'où GM_xmlhttpRequest. La voix est celle de Waze, obtenue par le client
 *  interne de WME (W.app.descartesClient.convertTextToVoice), qui rend l'adresse d'un MP3.
 *
 *  Rattachement d'une instruction, mesuré sur la réponse réelle : l'instruction portée par
 *  results[i] s'exécute à la FIN du tronçon i, pour passer sur i+1 ; `path.nodeId` d'un tronçon
 *  est son nœud d'ENTRÉE, donc le carrefour est results[i+1].path.
 *
 *  Ce que montre et dit le script suit l'appli Waze 5.24, lue dans son code : docs/appli-waze.
 *
 *  Le script ne modifie jamais la carte.
 */

(function () {
    'use strict';

    const pw = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const SCRIPT_ID = 'wme-route-preview';
    const SCRIPT_NAME = 'WME Route Preview';
    const VERSION = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || 'dev';
    const L_ROUTE = 'wrp-route';
    const L_POINTS = 'wrp-points';
    const L_FLASH = 'wrp-flash';
    const L_ZONES = 'wrp-zones';
    const L_ALT = 'wrp-alt';
    const FLASH_MS = 1600;

    let sdk = null;
    let paneEl = null;
    let pts = { A: null, B: null };     // {lon, lat, label}
    let trajet = null;                  // {manoeuvres, metres, secondes, coords, annonces, fiche, zones, R…}
    let trajets = [];                   // les itinéraires rendus par le serveur ; trajet est l'un d'eux
    let choixAlt = 0;
    let virageTeste = null;             // {de, vers} : le virage que le trajet doit prendre (ligne TRAJET, 2 segments)
    let lecture = null;                 // lecture enchaînée en cours
    const cacheVoix = new Map();

    const log = m => console.log('[WRP] ' + m);

    // =====================================================================
    //  I18N — l'interface en français et en anglais ; les phrases DITES sont dans PHR (8 langues), plus bas
    // =====================================================================

    const ORD = {
        fr: ['première', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième', 'dixième'],
        en: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'],
    };

    const DICO = {
        en: {
            openWin: 'Open the window', secSettings: 'Settings', optOpen: 'Open the window as soon as a route is computed',
            options: 'Options', now: 'Now', optDepart: 'Leave', optVehicle: 'Vehicle', optAvoid: 'Avoid', optPass: 'Passes',
            optTrails: 'Unpaved', tr_interdire: 'Do not allow', tr_longues: 'Avoid long ones', tr_autoriser: 'Allow',
            tr_longues_c: 'long unpaved roads avoided', tr_autoriser_c: 'unpaved roads allowed', optTurns: 'avoid difficult intersections',
            veh_PRIVATE: 'Car', veh_TAXI: 'Taxi', veh_MOTORCYCLE: 'Motorcycle', veh_EV: 'Electric',
            av_peages: 'tolls', av_autoroutes: 'freeways', av_ferries: 'ferries', avoidShort: x => 'avoid ' + x,
            nPass: n => n + ' pass' + (n > 1 ? 'es' : ''), noPass: 'No pass in this country.',
            optNote: 'Later departure: local time of the route, usual traffic at that time (not live traffic). Passes are those of the country shown on the map.',
            via: x => 'Via ' + x, toll: x => 'Toll ~ ' + x, tollUnknown: 'Toll', tollTip: d => 'Toll section: ' + d,
            zoneTip: 'Zone crossed by the route (low-emission zone, permit…)',
            zoneAvoidTip: 'Zone the route should have avoided: it crosses it anyway',
            permits: x => 'Permits required: ' + x, bypass: 'Restricted zone bypassed',
            bypassTip: 'The router had to go around a restricted zone', unpaved: 'Unpaved road',
            majBtn: v => 'Version ' + v + ' is available', majInstall: 'Install',
            departPasse: 'That time has passed: departure set back to now.',
            heureLieu: (h, tz) => 'Local time there: ' + h + ' (' + tz + ')',
            heureNav: (h, tz) => 'Time zone of your browser (' + tz + ', ' + h + ') until the first route gives the local one',
            errNoRoute: 'No route between these two points: move one of them onto a drivable road.',
            errNet: 'The Waze routing server cannot be reached: check the connection, then ⟳.',
            errTimeout: 'The Waze routing server did not answer in time: try again (⟳).',
            errHttp: c => 'The Waze routing server refused the request (HTTP ' + c + '): try again (⟳); if it persists, move a point.',
            errServeur: m => 'The Waze routing server answered: « ' + m + ' ». Move a point or change the options.',
            searchFail: 'The search failed: try again.',
            junctions: (l, n) => l + '/' + n + ' intersections outside the view read',
            junctionsTip: 'Lanes and ✎ of the other intersections outside the view could not be read (failure or limit of 40).',
            optionsBtn: 'Route options', optionsTip: 'Click to set the departure time, vehicle, roads to avoid and passes', optionsTipClose: 'Click to close the options',
            sbHint: 'Preview a route the way the Waze app gives it: instructions, signs, lanes and voice prompts.',
            voiceHint: 'Automatic: your language if the country offers it, otherwise the country voice. Choose a voice to hear what local drivers hear.',
            sbHelp: 'Help', sbSafe: 'The script never changes the map.',
            aide: [
                { t: 'Set the start and the finish', b: '<p><b>From the panel</b>: select a segment or a place, then the green flag (start) or the checkered flag (finish) on its ROUTE row.</p><p><b>By search</b>: type an address or a place in the window fields; <kbd>↑</kbd> <kbd>↓</kbd> then <kbd>Enter</kbd>.</p><p><b>By keyboard</b>: two shortcuts, start / finish under the pointer, without keys by default: Settings › Keyboard shortcuts.</p><p>The route is computed as soon as both are set. ⇅ swaps them, ✕ clears the route.</p>' },
                { t: 'The window', b: '<p>Opened by the button on the right of the map (same icon), or on its own after a computation (setting above).</p><p>Drag the header to move it, the corner to resize it; double-click the header to put it back. It never covers the map buttons.</p>' },
                { t: 'The list and the voice prompts', b: '<p>One row per instruction, as in the app list. A click unfolds the row (lanes, “then”) and centres the map on the intersection; <b>Select the approach segment</b> then selects it in WME, with its lanes and turn arrows.</p><p>✎ = instruction set by an editor. Each 🔊 chip plays one prompt with the Waze voice; ▶ Listen to all plays the whole drive.</p><p>Prompts follow the local planner found in the app code: 1.5 km, 1 km and 800 m above 70 km/h, 400 m and 200 m, then at the intersection — each only if the stretch since the previous turn is long enough. The app may get its prompts from the Waze server, or be set to a brief mode, and then speak less often: not measured yet.</p>' },
                { t: 'Route options', b: '<p>The app “Navigation” settings: departure now (live traffic) or later (usual traffic at that time, up to 14 days), vehicle, avoid tolls, freeways or ferries, unpaved roads, difficult intersections.</p><p>Passes: those of the country shown on the map; the ones that matter for this route come first, in bold.</p>' },
                { t: 'Other routes and tested turn', b: '<p>When the server offers several routes, they are listed under the summary (duration · distance · via): a click shows one; the others stay grey on the map.</p><p><b>Test a turn</b>: select two segments that meet at a node; the ROUTE row of the panel offers <b>Test</b> (⇅ swaps the direction). The route goes from the first to the second and says whether it takes the turn, and with which instruction.</p>' },
                { t: 'Before / after an edit', b: '<p>📌 keeps the route as the <b>reference</b>; when you save in WME, the route shown is kept on its own (it was computed before the save). Each later computation between the same start and finish is compared with it: <b>changed</b> or <b>new</b> rows, gone instructions and duration are given in the summary.</p><p>The router uses the published map: an edit reaches it only once Waze has updated that map (Waze sets the delay). The ✎ and custom voice text are read in WME, so they already show the edit.</p><p>References: in this browser only, listed in this tab.</p>' },
                { t: 'Sharing a route', b: '<p>🔗 copies a WME link: whoever opens it with the script gets the same start, finish and options (departure: now).</p>' },
                { t: 'Where the data comes from', b: '<p>The route, the signs and the zones come from the Waze routing server: it is the PUBLISHED map — an unsaved edit does not show.</p><p>Lanes and custom voice text of intersections outside the view are read from WME data, like WME does when you pan.</p>' },
            ],
            optVoice: 'Voice and phrases:', voiceAuto: 'Automatic',
            searchPh: k => (k === 'A' ? 'Start' : 'Finish') + ': search for an address or a place',
            noResult: 'No result.', noSearch: 'Search is unavailable in this version of WME.',
            dragTip: 'Drag to move · double-click to put it back', close: 'Close', recompute: 'Compute again',
            nInstr: n => n + ' instruction' + (n > 1 ? 's' : ''),
            emptyHint: 'Search an address or a place above, or select a segment or a place and press the start or finish flag in its panel (or “Selection” here).',
            setA: 'Start the route here', setB: 'End the route here', details: 'Details',
            scA: 'Route Preview: start under the pointer', scB: 'Route Preview: finish under the pointer',
            nearLabel: (name, id) => 'Near ' + (name || 'unnamed road') + ' · segment ' + id,
            ptLabel: (lat, lon) => 'Point ' + lat + ', ' + lon, noPointer: 'Hover the map first.',
            secRoute: 'Route', take: 'Selection', swap: 'Swap start and finish', clear: 'Clear the route', compute: 'Compute',
            playAll: '▶ Listen to all', stop: '■ Stop',
            none: 'not set', needAB: 'Set the start and the finish first.',
            badSel: 'Select exactly one segment or one place.',
            busy: 'Computing…',
            at: d => 'at ' + d, noVoice: 'Voice unavailable here.',
            custom: 'Custom instruction set on this turn in WME',
            segLabel: (name, id) => (name || 'Unnamed') + ' · segment ' + id,
            then: 'then',
            here: 'at the intersection', atArrival: 'on arrival', lblStart: 'Start', lblFinish: 'Finish',
            altTip: k => 'Route ' + k + ' proposed by the Waze server', unnamed: 'unnamed',
            selSeg: 'Select the approach segment', selAbsent: 'This segment is not loaded in WME: zoom in on it and try again.',
            selSegTip: 'Selects in WME the segment you arrive on: its lanes, and the turn arrows that lead to the custom instruction',
            turnLbl: 'Turn', turnTest: 'Test', turnTestTip: 'Compute a route from the first segment to the second through their common node',
            turnSwap: 'Swap the direction of the turn', turnBadSel: 'Select two segments that meet at a node.',
            turnOk: n => 'Tested turn: instruction ' + n, turnOkTip: 'The route takes the tested turn; the row is unfolded below.',
            turnSilent: 'Tested turn: taken, no instruction', turnSilentTip: 'The route takes the turn and the app says nothing there.',
            turnNo: 'Tested turn: not taken',
            turnNoTip: 'The route does not take this turn: it may be disallowed or restricted, or the router prefers another path. Check the arrows in WME.',
            turnNoAlt: n => 'Route ' + n + ' takes it (choose it above).',
            pinTip: 'Keep this route as the reference: later computations between the same start and finish are compared with it',
            pinReplace: d => 'Replace the reference of ' + d + ' with this route', pinDone: 'Route kept as the reference.',
            refSame: d => 'Same as on ' + d,
            refDiff: (d, mod, nou, dis) => 'Since ' + d + ': ' + [mod ? mod + ' changed' : '', nou ? nou + ' new' : '', dis ? dis + ' gone' : ''].filter(x => x).join(', '),
            refTime: (a, b) => 'Duration ' + a + ' → ' + b, refDist: (a, b) => 'distance ' + a + ' → ' + b,
            refOtherOpts: 'Computed with other options than the reference.', refGone: l => 'Gone: ' + l,
            refTipSame: 'Every instruction, sign, lane and custom voice text is unchanged.',
            diffMod: 'changed', diffNew: 'new', diffNewTip: 'No instruction here in the reference', diffBefore: 'Before',
            dLanes: 'lanes changed', dPersoOn: 'custom instruction added', dPersoOff: 'custom instruction removed', dVoice: x => 'voice: « ' + x + ' »',
            savedRef: h => 'Saved at ' + h + '. The route shown was computed before this save: it is kept as the reference 📌. The Waze router uses edits once Waze has updated the published map (Waze sets the delay): recompute ⟳ then to see what changes.',
            savedHasRef: h => 'Saved at ' + h + '. This route already has a reference 📌: recompute ⟳ once Waze has updated the published map to compare.',
            secRefs: 'References', refsHint: 'Routes kept for comparison (📌 in the window, or automatically when you save in WME). Stored in this browser only.',
            refsNone: 'No reference yet.', refOpen: 'Reopen', refDel: 'Delete this reference',
            link: 'Copy a link to this route', linkCopied: 'Link copied: opened in WME with the script, it gives back this route.',
            linkFail: 'Copy failed: the link is in the browser console.', linkIn: 'Route received by link: its options are applied.',
        },
        fr: {
            openWin: 'Ouvrir la fenêtre', secSettings: 'Réglages', optOpen: 'Ouvrir la fenêtre dès qu’un trajet est calculé',
            options: 'Options', now: 'Maintenant', optDepart: 'Départ', optVehicle: 'Véhicule', optAvoid: 'Éviter', optPass: 'Pass',
            optTrails: 'Non bitumé', tr_interdire: 'Interdire', tr_longues: 'Éviter les longues', tr_autoriser: 'Autoriser',
            tr_longues_c: 'longues routes non bitumées évitées', tr_autoriser_c: 'routes non bitumées autorisées', optTurns: 'éviter les intersections difficiles',
            veh_PRIVATE: 'Voiture', veh_TAXI: 'Taxi', veh_MOTORCYCLE: 'Moto', veh_EV: 'Électrique',
            av_peages: 'péages', av_autoroutes: 'autoroutes', av_ferries: 'ferries', avoidShort: x => 'éviter ' + x,
            nPass: n => n + ' pass', noPass: 'Aucun pass dans ce pays.',
            optNote: 'Départ plus tard\u00a0: heure du lieu du trajet, trafic habituel à cette heure (pas le trafic en direct). Les pass sont ceux du pays affiché sur la carte.',
            via: x => 'Via ' + x, toll: x => 'Péage ~ ' + x, tollUnknown: 'Péage', tollTip: d => 'Portion à péage\u00a0: ' + d,
            zoneTip: 'Zone traversée par le trajet (ZFE, zone à permis…)',
            zoneAvoidTip: 'Zone que le trajet aurait dû éviter\u00a0: il la traverse quand même',
            permits: x => 'Permis exigés\u00a0: ' + x, bypass: 'Zone restreinte contournée',
            bypassTip: 'Le calcul a dû contourner une zone restreinte', unpaved: 'Route non bitumée',
            majBtn: v => 'La version ' + v + ' est disponible', majInstall: 'Installer',
            departPasse: 'Cette heure est passée\u00a0: départ remis à maintenant.',
            heureLieu: (h, tz) => 'Heure sur place\u00a0: ' + h + ' (' + tz + ')',
            heureNav: (h, tz) => 'Fuseau de votre navigateur (' + tz + ', ' + h + ') en attendant que le premier calcul donne celui du lieu',
            errNoRoute: 'Aucun itinéraire entre ces deux points\u00a0: déplacez l’un d’eux sur une route praticable.',
            errNet: 'Le serveur de calcul de Waze est injoignable\u00a0: vérifiez la connexion, puis ⟳.',
            errTimeout: 'Le serveur de calcul de Waze n’a pas répondu à temps\u00a0: réessayez (⟳).',
            errHttp: c => 'Le serveur de calcul de Waze a refusé la demande (HTTP ' + c + ')\u00a0: réessayez (⟳)\u00a0; si cela persiste, déplacez un point.',
            errServeur: m => 'Le serveur de calcul de Waze a répondu\u00a0: «\u00a0' + m + '\u00a0». Déplacez un point ou changez les options.',
            searchFail: 'La recherche a échoué\u00a0: réessayez.',
            junctions: (l, n) => l + '/' + n + ' carrefours hors de la vue lus',
            junctionsTip: 'Les voies et les ✎ des autres carrefours hors de la vue n’ont pas pu être lus (échec ou plafond de 40).',
            optionsBtn: 'Options du calcul', optionsTip: 'Cliquer pour régler le départ, le véhicule, les routes à éviter et les pass', optionsTipClose: 'Cliquer pour refermer les options',
            sbHint: 'Prévisualiser un trajet comme l’appli Waze le donne\u00a0: instructions, panneaux, voies et annonces vocales.',
            voiceHint: 'Automatique\u00a0: votre langue si le pays la propose, sinon la voix du pays. Choisir une voix pour entendre ce qu’entendent les conducteurs du pays.',
            sbHelp: 'Aide', sbSafe: 'Le script ne modifie jamais la carte.',
            aide: [
                { t: 'Poser le départ et l’arrivée', b: '<p><b>Depuis le panneau</b>\u00a0: sélectionnez un segment ou un lieu, puis le drapeau vert (départ) ou à damier (arrivée) de sa ligne TRAJET.</p><p><b>Par la recherche</b>\u00a0: tapez une adresse ou un lieu dans les champs de la fenêtre\u00a0; <kbd>↑</kbd> <kbd>↓</kbd> puis <kbd>Entrée</kbd>.</p><p><b>Au clavier</b>\u00a0: deux raccourcis, départ / arrivée sous le pointeur, sans touches par défaut\u00a0: Paramètres › Raccourcis clavier.</p><p>Le calcul part dès que les deux sont posés. ⇅ les inverse, ✕ efface le trajet.</p>' },
                { t: 'La fenêtre', b: '<p>Ouverte par le bouton à droite de la carte (même icône), ou d’elle-même après un calcul (réglage ci-dessus).</p><p>Glisser l’en-tête pour la déplacer, le coin pour l’agrandir\u00a0; double-clic sur l’en-tête pour la remettre en place. Elle ne passe jamais sur les boutons de la carte.</p>' },
                { t: 'La liste et les annonces', b: '<p>Une ligne par instruction, comme la liste de l’appli. Un clic la déplie (voies, «\u00a0puis\u00a0») et centre la carte sur l’intersection\u00a0; <b>Sélectionner le segment d’approche</b> le sélectionne alors dans WME, avec ses voies et ses flèches de virage.</p><p>✎ = instruction posée par un éditeur. Chaque puce 🔊 fait entendre une annonce avec la voix de Waze\u00a0; ▶ Tout écouter enchaîne le trajet.</p><p>Les annonces suivent le planificateur local lu dans le code de l’appli\u00a0: 1,5 km, 1 km et 800 m au-dessus de 70 km/h, 400 m et 200 m, puis à l’intersection — chacune seulement si le tronçon depuis le virage précédent est assez long. L’appli peut recevoir ses annonces du serveur de Waze, ou être réglée en mode bref, et parler alors moins souvent\u00a0: pas encore mesuré.</p>' },
                { t: 'Options du calcul', b: '<p>Les réglages «\u00a0Navigation\u00a0» de l’appli\u00a0: départ maintenant (trafic réel) ou plus tard (trafic habituel à cette heure, jusqu’à 14 jours), véhicule, éviter péages, autoroutes ou ferries, routes non bitumées, intersections difficiles.</p><p>Pass\u00a0: ceux du pays affiché sur la carte\u00a0; ceux qui concernent le trajet viennent en tête, en gras.</p>' },
                { t: 'Autres itinéraires et virage testé', b: '<p>Quand le serveur propose plusieurs itinéraires, ils sont listés sous le résumé (durée · distance · via)\u00a0: un clic en affiche un\u00a0; les autres restent en gris sur la carte.</p><p><b>Tester un virage</b>\u00a0: sélectionnez deux segments qui se rejoignent à un nœud\u00a0; la ligne TRAJET du panneau propose <b>Tester</b> (⇅ inverse le sens). Le trajet va du premier au second et dit s’il prend le virage, et avec quelle instruction.</p>' },
                { t: 'Avant / après une modification', b: '<p>📌 garde le trajet comme <b>référence</b>\u00a0; quand vous enregistrez dans WME, le trajet affiché est gardé d’office (il a été calculé avant l’enregistrement). Chaque calcul suivant entre les mêmes départ et arrivée lui est comparé\u00a0: lignes <b>modifiées</b> ou <b>nouvelles</b>, instructions disparues et durée sont données dans le résumé.</p><p>Le calcul se fait sur la carte publiée\u00a0: une modification ne l’atteint qu’une fois cette carte mise à jour par Waze (délai fixé par Waze). Les ✎ et textes vocaux personnalisés sont lus dans WME\u00a0: eux montrent la modification tout de suite.</p><p>Références\u00a0: dans ce navigateur seulement, listées dans cet onglet.</p>' },
                { t: 'Partager un trajet', b: '<p>🔗 copie un lien WME\u00a0: ouvert avec le script, il redonne le même départ, la même arrivée et les mêmes options (départ\u00a0: maintenant).</p>' },
                { t: 'D’où viennent les données', b: '<p>Le trajet, les panneaux et les zones viennent du serveur de calcul de Waze\u00a0: c’est la carte PUBLIÉE — une modification non enregistrée n’y paraît pas.</p><p>Les voies et les textes vocaux personnalisés des intersections hors de la vue sont lus dans les données de WME, comme WME le fait quand on se déplace.</p>' },
            ],
            optVoice: 'Voix et phrases\u00a0:', voiceAuto: 'Automatique',
            searchPh: k => (k === 'A' ? 'Départ' : 'Arrivée') + '\u00a0: rechercher une adresse ou un lieu',
            noResult: 'Aucun résultat.', noSearch: 'La recherche n’est pas disponible dans cette version de WME.',
            dragTip: 'Glisser pour déplacer · double-clic pour la remettre en place', close: 'Fermer', recompute: 'Recalculer',
            nInstr: n => n + ' instruction' + (n > 1 ? 's' : ''),
            emptyHint: 'Recherchez une adresse ou un lieu ci-dessus, ou sélectionnez un segment ou un lieu et appuyez sur le drapeau de départ ou d’arrivée dans son panneau (ou sur «\u00a0Sélection\u00a0» ici).',
            setA: 'Partir d’ici', setB: 'Arriver ici', details: 'Détail',
            scA: 'Route Preview\u00a0: départ sous le pointeur', scB: 'Route Preview\u00a0: arrivée sous le pointeur',
            nearLabel: (name, id) => 'Près de ' + (name || 'voie sans nom') + ' · segment ' + id,
            ptLabel: (lat, lon) => 'Point ' + lat + '\u00a0; ' + lon, noPointer: 'Survolez d’abord la carte.',
            secRoute: 'Trajet', take: 'Sélection', swap: 'Inverser départ et arrivée', clear: 'Effacer le trajet', compute: 'Calculer',
            playAll: '▶ Tout écouter', stop: '■ Arrêter',
            none: 'non défini', needAB: 'Définissez d\'abord le départ et l\'arrivée.',
            badSel: 'Sélectionnez un seul segment ou un seul lieu.',
            busy: 'Calcul…',
            at: d => 'à ' + d, noVoice: 'Voix indisponible ici.',
            custom: 'Instruction personnalisée posée sur ce virage dans WME',
            segLabel: (name, id) => (name || 'Sans nom') + ' · segment ' + id,
            altTip: k => 'Itinéraire ' + k + ' proposé par le serveur de Waze', unnamed: 'sans nom',
            selSeg: 'Sélectionner le segment d’approche', selAbsent: 'Ce segment n’est pas chargé dans WME\u00a0: zoomez dessus et recommencez.',
            selSegTip: 'Sélectionne dans WME le segment par lequel on arrive\u00a0: ses voies, et les flèches de virage qui mènent à l’instruction personnalisée',
            turnLbl: 'Virage', turnTest: 'Tester', turnTestTip: 'Calcule un trajet qui passe du premier segment au second par leur nœud commun',
            turnSwap: 'Inverser le sens du virage', turnBadSel: 'Sélectionnez deux segments qui se rejoignent à un nœud.',
            turnOk: n => 'Virage testé\u00a0: instruction ' + n, turnOkTip: 'Le trajet prend le virage testé\u00a0; sa ligne est dépliée ci-dessous.',
            turnSilent: 'Virage testé\u00a0: pris, sans instruction', turnSilentTip: 'Le trajet prend le virage et l’appli n’y dit rien.',
            turnNo: 'Virage testé\u00a0: non pris',
            turnNoTip: 'Le trajet ne prend pas ce virage\u00a0: il est peut-être interdit ou restreint, ou le calcul préfère un autre chemin. Vérifiez les flèches dans WME.',
            turnNoAlt: n => 'L’itinéraire ' + n + ' le prend (choisissez-le ci-dessus).',
            pinTip: 'Garder ce trajet comme référence\u00a0: les calculs suivants entre les mêmes départ et arrivée lui sont comparés',
            pinReplace: d => 'Remplacer la référence du ' + d + ' par ce trajet', pinDone: 'Trajet gardé comme référence.',
            refSame: d => 'Identique au ' + d,
            refDiff: (d, mod, nou, dis) => 'Depuis le ' + d + '\u00a0: ' + [mod ? mod + ' modifiée' + (mod > 1 ? 's' : '') : '', nou ? nou + ' nouvelle' + (nou > 1 ? 's' : '') : '', dis ? dis + ' disparue' + (dis > 1 ? 's' : '') : ''].filter(x => x).join(', '),
            refTime: (a, b) => 'Durée ' + a + ' → ' + b, refDist: (a, b) => 'distance ' + a + ' → ' + b,
            refOtherOpts: 'Calculé avec d’autres options que la référence.', refGone: l => 'Disparues\u00a0: ' + l,
            refTipSame: 'Instructions, panneaux, voies et textes vocaux personnalisés\u00a0: rien n’a changé.',
            diffMod: 'modifiée', diffNew: 'nouvelle', diffNewTip: 'Aucune instruction ici dans la référence', diffBefore: 'Avant',
            dLanes: 'voies modifiées', dPersoOn: 'instruction personnalisée ajoutée', dPersoOff: 'instruction personnalisée retirée', dVoice: x => 'voix\u00a0: «\u00a0' + x + '\u00a0»',
            savedRef: h => 'Enregistré à ' + h + '. Le trajet affiché a été calculé avant cet enregistrement\u00a0: il est gardé comme référence 📌. Le calcul de Waze ne prend les modifications qu’une fois la carte publiée mise à jour par Waze (délai fixé par Waze)\u00a0: recalculez ⟳ à ce moment-là pour voir ce qui change.',
            savedHasRef: h => 'Enregistré à ' + h + '. Ce trajet a déjà une référence 📌\u00a0: recalculez ⟳ une fois la carte publiée mise à jour par Waze pour comparer.',
            secRefs: 'Références', refsHint: 'Trajets gardés pour comparer (📌 dans la fenêtre, ou d’office quand vous enregistrez dans WME). Conservés dans ce navigateur seulement.',
            refsNone: 'Aucune référence pour l’instant.', refOpen: 'Rouvrir', refDel: 'Supprimer cette référence',
            link: 'Copier un lien vers ce trajet', linkCopied: 'Lien copié\u00a0: ouvert dans WME avec le script, il redonne ce trajet.',
            linkFail: 'La copie a échoué\u00a0: le lien est dans la console du navigateur.', linkIn: 'Trajet reçu par lien\u00a0: ses options sont appliquées.',
            ops: {
                TURN_LEFT: 'Tournez à gauche', TURN_RIGHT: 'Tournez à droite', KEEP_LEFT: 'Serrez à gauche', KEEP_RIGHT: 'Serrez à droite',
                EXIT_LEFT: 'Sortez à gauche', EXIT_RIGHT: 'Sortez à droite', UTURN: 'Faites demi-tour', CONTINUE: 'Continuez tout droit',
                ROUNDABOUT_LEFT: 'Au rond-point, tournez à gauche', ROUNDABOUT_RIGHT: 'Au rond-point, tournez à droite',
                ROUNDABOUT_STRAIGHT: 'Au rond-point, continuez tout droit', ROUNDABOUT_U: 'Au rond-point, faites demi-tour',
                APPROACHING_DESTINATION: 'Vous êtes arrivé',
            },
            rbExit: n => 'Au rond-point, prenez la ' + (ORD.fr[n - 1] || n + 'e') + ' sortie',
            onto: s => ' sur ' + s,
            inDist: d => imperial()
                ? ({ 200: 'Dans 500 pieds', 400: 'Dans un quart de mile', 800: 'Dans un demi-mile', 1000: 'Dans 0,6 mile', 1500: 'Dans 1 mile' }[d] || 'Dans ' + d + ' mètres')
                : ({ 1000: 'Dans 1 kilomètre', 1500: 'Dans 1,5 kilomètre' }[d] || 'Dans ' + d + ' mètres'),
            then: 'puis',
            here: 'à l\'intersection', atArrival: 'à l\'arrivée', lblStart: 'Départ', lblFinish: 'Arrivée',
        },
    };

    let _lang = 'en';
    const t = (key, ...args) => {
        const v = (DICO[_lang] && DICO[_lang][key]) || DICO.en[key];
        if (typeof v === 'function') return v(...args);
        return v !== undefined ? v : key;
    };
    const detectLang = () => {
        try {
            const l = (pw.W?.userscripts?.state?.locale || document.documentElement.lang || navigator.language || 'en').toLowerCase();
            return l.startsWith('fr') ? 'fr' : 'en';
        } catch (e) { return 'en'; }
    };

    const esc = s => String(s == null ? '' : s).replace(/[&<>\x22]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\x22': '&quot;' }[c]));

    // =====================================================================
    //  Géométrie et formats
    // =====================================================================

    function metres(a, b) {
        const kx = 111320 * Math.cos((a[1] + b[1]) / 2 * Math.PI / 180);
        return Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * 110540);
    }

    function milieu(coords) {
        let total = 0;
        for (let i = 1; i < coords.length; i++) total += metres(coords[i - 1], coords[i]);
        let reste = total / 2;
        for (let i = 1; i < coords.length; i++) {
            const d = metres(coords[i - 1], coords[i]);
            if (reste <= d && d > 0) {
                const u = reste / d;
                return [coords[i - 1][0] + u * (coords[i][0] - coords[i - 1][0]), coords[i - 1][1] + u * (coords[i][1] - coords[i - 1][1])];
            }
            reste -= d;
        }
        return coords[coords.length - 1];
    }

    function centroide(geom) {
        if (!geom) return null;
        if (geom.type === 'Point') return geom.coordinates;
        const ring = geom.type === 'Polygon' ? geom.coordinates[0] : null;
        if (!ring) return null;
        let x = 0, y = 0;
        for (const [a, b] of ring) { x += a; y += b; }
        return [x / ring.length, y / ring.length];
    }

    const nb = (v, d) => new Intl.NumberFormat(_lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    const imperial = () => { try { return !!sdk.Settings.getUserSettings().isImperial; } catch (e) { return false; } };
    // Formateur de référence de l'appli (com.waze.sharedui.utils.c) : dizaine SUPÉRIEURE, au moins 10 ;
    // au-delà de 1 000 m (528 ft) en km (mi), une décimale sous 9,5 puis aucune.
    function distTexte(m) {
        const grand = v => nb(v, v < 9.5 ? 1 : 0);
        if (imperial()) {
            const ft = m * 3.28084;
            return ft < 528 ? nb(Math.max(10, Math.ceil(ft / 10) * 10), 0) + ' ft' : grand(ft / 5280) + ' mi';
        }
        return m < 1000 ? nb(Math.max(10, Math.ceil(m / 10) * 10), 0) + ' m' : grand(m / 1000) + ' km';
    }
    // Distances du bandeau et de la liste, relevées sur des captures de l'appli (25/09/2026) : au MÈTRE
    // près sous 1 km (« 22 m », « 171 m », « 963 m » — pas d'arrondi à la dizaine), puis une décimale
    // avec un POINT, même en français (« 3.9 km »). Au-delà de 9,5 km, sans décimale (formateur Java).
    function distAppli(m) {
        if (imperial()) return distTexte(m);
        if (m < 1000) return Math.max(1, Math.round(m)) + ' m';
        const km = m / 1000;
        return (km < 9.5 ? km.toFixed(1) : String(Math.round(km))) + ' km';
    }
    // Arrondir à la minute AVANT de découper : 7 170 s donnait « 1 h 60 » (audit D2).
    const dureeTexte = s => { const mn = Math.max(1, Math.round(s / 60)); return mn >= 60 ? Math.floor(mn / 60) + ' h ' + String(mn % 60).padStart(2, '0') : mn + ' min'; };

    // =====================================================================
    //  A et B, pris dans la sélection
    // =====================================================================

    function nomRue(streetId) {
        try { return streetId ? (sdk.DataModel.Streets.getById({ streetId })?.name || '') : ''; } catch (e) { return ''; }
    }

    function pointDepuisSelection() {
        let sel;
        try { sel = sdk.Editing.getSelection(); } catch (e) { return null; }
        if (!sel || !sel.ids || sel.ids.length !== 1) return null;
        const id = sel.ids[0];
        if (sel.objectType === 'segment') {
            const s = sdk.DataModel.Segments.getById({ segmentId: id });
            if (!s) return null;
            const [lon, lat] = milieu(s.geometry.coordinates);
            return { lon, lat, label: t('segLabel', nomRue(s.primaryStreetId), id), ref: 'segment:' + id };
        }
        if (sel.objectType === 'venue') {
            const v = sdk.DataModel.Venues.getById({ venueId: id });
            const c = v && centroide(v.geometry);
            if (!c) return null;
            return { lon: c[0], lat: c[1], label: (v.name || '?') + ' · ' + (sel.localizedTypeName || 'venue'), ref: 'venue:' + id };
        }
        return null;
    }

    // Le point sous le pointeur, suivi par wme-map-mouse-move. Son libellé est la rue du segment
    // chargé le plus proche (à moins de 60 m), comme le routeur s'y raccrochera.
    let curseur = null;                 // {lon, lat}
    const PROCHE_M = 60;
    function distPointSegment(p, a, b) {
        const kx = 111320 * Math.cos(p[1] * Math.PI / 180), ky = 110540;
        const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        const u = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
        return Math.hypot(ax + u * dx, ay + u * dy);
    }
    function pointSousCurseur() {
        if (!curseur) return null;
        const p = [curseur.lon, curseur.lat];
        let best = null, dmin = PROCHE_M;
        try {
            for (const s of sdk.DataModel.Segments.getAll()) {
                const c = s.geometry.coordinates;
                for (let i = 1; i < c.length; i++) {
                    const d = distPointSegment(p, c[i - 1], c[i]);
                    if (d < dmin) { dmin = d; best = s; }
                }
            }
        } catch (e) { }
        const label = best ? t('nearLabel', nomRue(best.primaryStreetId), best.id)
            : t('ptLabel', nb(curseur.lat, 5), nb(curseur.lon, 5));
        return { lon: curseur.lon, lat: curseur.lat, label };
    }

    // =====================================================================
    //  Calcul d'itinéraire (Live Map)
    // =====================================================================

    // Région de WME (ROW, NA, IL) : une seule lecture pour le calcul, les données et les écussons.
    function envWaze() {
        try { return pw.W.model.topCountry.attributes.env || 'ROW'; } catch (e) { return 'ROW'; }
    }

    function urlRouteur() {
        const env = envWaze();
        const hote = env === 'NA' ? 'am' : env === 'IL' ? 'il' : 'row';
        return 'https://routing-livemap-' + hote + '.waze.com/RoutingManager/routingRequest';
    }

    // Options mesurées sur le calcul Live Map (docs/options-calcul-livemap.md) :
    //  at = départ dans N MINUTES (0 = maintenant avec le trafic réel, > 0 = trafic habituel à cette heure) ;
    //  vehicleType ; options AVOID_* ; pass de zone : subscription RÉPÉTÉ — « a,b » est accepté
    //  sans erreur et SANS EFFET.
    function demanderTrajet(a, b) {
        const at = depart ? Math.max(0, Math.round((depart.getTime() - Date.now()) / 60000)) : 0;
        // Mêmes réglages que l'écran « Navigation » de l'appli ; noms d'options lus dans son code
        // (com.waze.modules.d.dd) et acceptés par le serveur.
        // GENERATE_ROAD_SIGNS : chaque tronçon reçoit le panneau que l'appli affiche (roadSign).
        const eviter = ['ALLOW_UTURNS:t', 'GENERATE_ROAD_SIGNS:t'].concat(EVITER.filter(e => opts.eviter.includes(e.id)).map(e => e.opt + ':t'));
        if (opts.bitume === 'interdire') eviter.push('AVOID_TRAILS:t');
        else if (opts.bitume === 'longues') eviter.push('AVOID_LONG_TRAILS:t');
        if (opts.intersections) eviter.push('AVOID_DANGEROUS_TURNS:t');
        const q = [
            ['from', 'x:' + a.lon + ' y:' + a.lat], ['to', 'x:' + b.lon + ' y:' + b.lat],
            ['at', at], ['returnJSON', true], ['returnGeometries', true], ['returnInstructions', true],
            ['timeout', 60000], ['nPaths', 3], ['clientVersion', '4.0.0'], ['type', 'HISTORIC_TIME'],
            ['options', eviter.join(',')], ['vehicleType', VEHICULES.includes(opts.vehicule) ? opts.vehicule : 'PRIVATE'],
        ].concat(passActifs().map(id => ['subscription', id]));
        const url = urlRouteur() + '?' + q.map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
        return new Promise((ok, ko) => {
            GM_xmlhttpRequest({
                // 70 s : le serveur reçoit déjà timeout=60000 ; sans délai ici, « Calcul… » restait affiché
                // indéfiniment si la réponse ne venait jamais (audit C3).
                method: 'GET', url, responseType: 'json', nocache: true, timeout: 70000,
                onload: r => {
                    let j = r.response;
                    if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e) { j = null; } }
                    if (!j || j.error) return ko(new Error(j && j.error ? String(j.error) : 'HTTP ' + r.status));
                    ok(j);
                },
                onerror: () => ko(new Error('network')), ontimeout: () => ko(new Error('timeout')),
            });
        });
    }

    // Le tronçon k porte-t-il lui-même une manœuvre (qui s'exécute à sa fin) ?
    const manoeuvreSur = (R, k) => {
        const op = R[k] && R[k].instruction && R[k].instruction.opcode;
        return !!op && op !== 'NONE' && op !== 'ROUNDABOUT_EXIT';
    };

    // La rue annoncée est la prochaine rue nommée après la manœuvre, SANS DÉPASSER LA MANŒUVRE SUIVANTE :
    // un tronçon qui porte sa propre manœuvre est le dernier où chercher, la rue d'après appartient à
    // l'instruction suivante. Tourner sur une route sans nom n'annonce donc aucun nom.
    // 🔴 Avant la 0.11.01 on sautait jusqu'à 4 tronçons sans nom, virages compris : « tournez à droite »
    // sur un chemin sans nom recevait le nom de la rue du virage SUIVANT (signalé par l'auteur, Rue 188).
    // Portée commune à la rue (voix) et à l'écusson (écran) : 5 et 4 tronçons les faisaient diverger (audit D4).
    const SANS_NOM_MAX = 4;
    function rueSuivante(R, noms, i) {
        if (i >= R.length - 1) return noms[R[i].street] || '';
        for (let k = i + 1, sansNom = 0; k < R.length; k++) {
            const n = noms[R[k].street];
            if (n) return n;
            if (manoeuvreSur(R, k) || ++sansNom >= SANS_NOM_MAX) break;
        }
        return '';
    }

    // Instructions personnalisées des virages chargés dans WME, indexées « de>vers ».
    function lireGuidages() {
        const m = new Map();
        try {
            for (const tu of sdk.DataModel.Turns.getAll()) {
                if (tu.turnGuidance) m.set(tu.fromSegmentId + '>' + tu.toSegmentId, tu.turnGuidance);
            }
        } catch (e) { log('virages : ' + e.message); }
        return m;
    }

    // Le panneau d'un tronçon tel que le serveur le calcule pour l'appli (option GENERATE_ROAD_SIGNS) :
    // primaryMarkup / secondaryMarkup avec des jetons $RS-n (n = index dans roadShields), exitSigns,
    // textRepresentation (« A7: Lyon »). Rendu dans la même forme que turnGuidance du SDK, pour que
    // le bandeau le traite pareil. Comme l'appli : un jeton hors limites vide TOUTE la ligne.
    function panneauServeur(rs, ttsWme) {
        if (!rs) return null;
        const sh = Array.isArray(rs.roadShields) ? rs.roadShields : [];
        let casse = false;
        const morceaux = txt => {
            if (!txt) return [];
            return txt.split(/(\$RS-\d+)/).map(x => {
                const m = /^\$RS-(\d+)$/.exec(x);
                if (!m) return x.trim();
                const e = sh[Number(m[1])];
                if (!e) { casse = true; return ''; }
                return { id: e.type, signText: e.text || '', direction: e.direction || '' };
            }).filter(x => x);
        };
        const vi = morceaux(rs.primaryMarkup);
        // La direction garde ses écussons (« [D528] Chevaigné ») : les aplatir en texte les faisait
        // disparaître de la ligne « en direction de » (signalé par milkyway35, 28/09/2026).
        const sec = morceaux(rs.secondaryMarkup);
        if (casse) return null;
        return {
            visualInstruction: vi,
            towards: sec.length ? [sec] : [],
            exitSigns: (Array.isArray(rs.exitSigns) ? rs.exitSigns : []).map(e => ({ id: e.type, description: e.text || '' })),
            tts: ttsWme || rs.textRepresentation || '',
            serveur: true,
        };
    }

    // Écusson de la rue d'après le serveur : un tronçon dont le panneau n'est QUE « $RS-0 » — le
    // serveur a déjà appliqué la règle « l'écusson remplace le nom » (A7, N7, pas « Rue … »).
    // ⚠️ Seulement sur un tronçon SANS manœuvre : sur un tronçon qui en porte une, le panneau est celui
    // de CETTE manœuvre-là (le virage suivant), pas l'écusson de la rue — confusion corrigée en 0.11.01.
    // ⚠️ Et le panneau d'un tronçon décrit le passage vers le tronçon SUIVANT : il ne vaut pour la rue de
    // celui-ci que si la rue ne change pas entre les deux (audit D5, défaut latent sur les bancs).
    function ecussonServeur(R, depuis) {
        if (depuis >= R.length || manoeuvreSur(R, depuis)) return null;
        if (depuis + 1 < R.length && R[depuis + 1].street !== R[depuis].street) return null;
        const rs = R[depuis].roadSign;
        if (!rs || (rs.primaryMarkup || '').trim() !== '$RS-0' || !rs.roadShields || !rs.roadShields[0]) return null;
        const e = rs.roadShields[0];
        return { id: e.type, signText: e.text || '', direction: e.direction || '' };
    }

    // =====================================================================
    //  Carrefours hors de la vue : voies et instructions lues dans le service de WME
    // =====================================================================
    //  WME ne connaît que ce qu'il a chargé. Son service Features (celui qu'il appelle en se déplaçant)
    //  rend, pour chaque virage, `connections["<de><f|r>"]["<vers><f|r>"]` = {lanes: {laneArrowAngle,
    //  fromLaneIndex, toLaneIndex}, turnGuidance: {visualInstruction, towards, roadShields, exitSigns,
    //  tts}} — f = segment parcouru dans son sens, r = à rebours (vérifié contre le SDK le 25/09/2026).
    //  On l'interroge autour des seuls carrefours qui en ont besoin.
    const CARREFOURS_MAX = 40, CARREFOUR_MARGE = 0.0007;

    function urlFeatures(bbox) {
        const env = envWaze();
        const base = env === 'NA' ? '/Descartes' : env === 'IL' ? '/il-Descartes' : '/row-Descartes';
        return base + '/app/Features?bbox=' + bbox.map(x => x.toFixed(6)).join(',') +
            '&language=' + encodeURIComponent(_lang) + '&v=2&apiV2=true&zoomLevel=17&roadTypes=1,2,3,4,5,6,7,8,9,10,15,16,17,18,19,20,22';
    }

    async function lireCarrefour(pts, voies, tgs) {
        const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
        const bbox = [Math.min(...xs) - CARREFOUR_MARGE, Math.min(...ys) - CARREFOUR_MARGE, Math.max(...xs) + CARREFOUR_MARGE, Math.max(...ys) + CARREFOUR_MARGE];
        const r = await fetch(urlFeatures(bbox), { credentials: 'include' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        // Une réponse sans « connections » n'est pas une lecture : on la compte en échec (audit C5).
        if (!j || !j.connections) throw new Error('réponse sans connexions');
        const conn = j.connections;
        for (const de in conn) {
            const fromId = parseInt(de, 10), fromFwd = de.slice(-1) === 'f';
            for (const vers in conn[de]) {
                const c = conn[de][vers];
                if (!c || c === true) continue;
                const toId = parseInt(vers, 10);
                if (c.turnGuidance) tgs.set(fromId + '>' + toId, c.turnGuidance);
                if (c.lanes) {
                    const k = fromId + '|' + fromFwd;
                    if (!voies.has(k)) voies.set(k, []);
                    const l = voies.get(k);
                    if (!l.some(x => x.toSegmentId === toId)) {
                        l.push({ fromSegmentId: fromId, toSegmentId: toId, lanes: { fromLaneIndex: c.lanes.fromLaneIndex, toLaneIndex: c.lanes.toLaneIndex, arrowAngle: c.lanes.laneArrowAngle, angleOverride: null } });
                    }
                }
            }
        }
    }

    // Après l'affichage : complète voies, texte vocal et ✎ des manœuvres que WME n'a pas chargées.
    async function completerCarrefours(tr, moi) {
        const R = tr.R;
        const voies = lireVoies(), tgs = lireGuidages();
        // Un carrefour dont le segment d'approche est chargé dans WME a déjà été lu par lireVoies/lireGuidages :
        // le relire gaspillait une place sous le plafond (audit C5).
        const charge = id => { try { return !!sdk.DataModel.Segments.getById({ segmentId: id }); } catch (e) { return false; } };
        const candidats = tr.manoeuvres.filter(m => m.i != null && m.i + 1 < R.length && !m.perso && !charge(R[m.i].path.segmentId) &&
            ((!m.voies && R[m.i].instruction && R[m.i].instruction.laneGuidance) || (m.tg && m.tg.serveur)));
        const aLire = candidats.slice(0, CARREFOURS_MAX);
        if (!aLire.length) return;
        let lus = 0;
        const file = aLire.slice();
        const ouvrier = async () => {
            while (file.length && moi === generation) {
                const m = file.shift();
                const noeuds = [R[m.i + 1].path];
                if (m.sortie >= 0 && m.sortie + 1 < R.length) noeuds.push(R[m.sortie + 1].path);
                try { await lireCarrefour(noeuds, voies, tgs); lus++; } catch (e) { log('carrefour : ' + e.message); }
            }
        };
        await Promise.all([ouvrier(), ouvrier(), ouvrier()]);
        if (moi !== generation || trajet !== tr) return;
        const changes = [];
        tr.manoeuvres.forEach((m, k) => {
            if (m.i == null || m.i + 1 >= R.length) return;
            let ch = false;
            const v = m.voies || voiesManoeuvre(R, m.i, voies);
            const tgWme = guidageManoeuvre(R, m.i, m.op, tgs);
            if (v !== m.voies) { m.voies = v; ch = true; }
            if (tgWme && !m.perso) {
                m.perso = true;
                if (m.tg && m.tg.serveur) { if (tgWme.tts) m.tg.tts = tgWme.tts; } else m.tg = tgWme;
                ch = true;
            }
            if (ch) changes.push(k);
        });
        // Ce qui n'a pas pu être lu se DIT : une ligne sans voies ni ✎ ressemblait sinon à un manque de la carte.
        tr.carrefours = { total: candidats.length, lus, echecs: aLire.length - lus, plafond: candidats.length - aLire.length };
        log('carrefours hors de la vue : ' + lus + '/' + candidats.length + ' lus' + (changes.length ? ', ' + changes.length + ' instruction(s) complétée(s)' : ''));
        // Voies et ✎ complétés changent la comparaison à la référence : on la refait avant de redessiner.
        tr.comparaison = comparerRef(tr);
        // Seules les lignes complétées sont redessinées : la liste garde sa position (audit C6).
        const lis = ovEl ? ovEl.querySelectorAll('.wrp-list li') : [];
        for (const k of changes) {
            if (!lis[k]) continue;
            lis[k].innerHTML = ligneHTML(k, k === deplieeIdx, k === deplieeIdx ? distDepliee : undefined);
            lis[k].title = verbe(tr.manoeuvres[k]);
        }
        majResume();
    }

    // Où lire l'instruction personnalisée d'une manœuvre :
    //  - rond-point : sur le virage d'ENTRÉE s'il en porte une, sinon sur le virage de SORTIE (du dernier
    //    segment de l'anneau vers la route de sortie). Règle de l'appli (docs/appli-waze/bandeau-et-liste.md) :
    //    l'instruction de la sortie est copiée sur l'entrée, une instruction posée sur l'entrée l'emporte ;
    //  - sinon : le virage direct i → i+1, puis un virage « chemin » (boîte de jonction) qui part
    //    du même segment vers un segment plus loin.
    function guidageManoeuvre(R, i, op, tgs) {
        const seg = k => R[k].path.segmentId;
        if (op.startsWith('ROUNDABOUT_')) {
            const entree = i + 1 < R.length ? tgs.get(seg(i) + '>' + seg(i + 1)) : null;
            if (entree) return entree;
            const j = indexSortie(R, i);
            return j >= 0 && j + 1 < R.length ? (tgs.get(seg(j) + '>' + seg(j + 1)) || null) : null;
        }
        for (let b = i + 1; b < Math.min(R.length, i + 7); b++) {
            const tg = tgs.get(seg(i) + '>' + seg(b));
            if (tg) return tg;
        }
        return null;
    }

    function indexSortie(R, i) {
        for (let k = i + 1; k < R.length; k++) {
            const op = R[k].instruction && R[k].instruction.opcode;
            if (op === 'ROUNDABOUT_EXIT') return k;
            if (op && op !== 'NONE') break;
        }
        return -1;
    }

    // Écusson de la rue où l'on s'engage : lu sur la Street WME du premier segment nommé après la
    // manœuvre (segments chargés seulement). null si aucun.
    function ecussonRue(R, depuis) {
        for (let k = depuis; k < Math.min(R.length, depuis + SANS_NOM_MAX); k++) {
            if (k > depuis && manoeuvreSur(R, k - 1)) return null;     // au-delà de la manœuvre suivante
            try {
                const s = sdk.DataModel.Segments.getById({ segmentId: R[k].path.segmentId });
                const st = s && s.primaryStreetId ? sdk.DataModel.Streets.getById({ streetId: s.primaryStreetId }) : null;
                if (st && st.name) return st.signType ? { id: st.signType, signText: st.signText || '', direction: st.direction || '', nom: st.name, roadType: s.roadType } : null;
            } catch (e) { return null; }
        }
        return null;
    }

    // Virages avec voies, indexés par segment d'approche et sens (« id|true »).
    function lireVoies() {
        const m = new Map();
        try {
            for (const tu of sdk.DataModel.Turns.getAll()) {
                if (!tu.lanes) continue;
                const k = tu.fromSegmentId + '|' + tu.fromSegmentFwd;
                if (!m.has(k)) m.set(k, []);
                m.get(k).push(tu);
            }
        } catch (e) { log('voies : ' + e.message); }
        return m;
    }

    // Bande de voies vue en approche de la manœuvre, comme l'appli la reçoit (ClientLaneSet) :
    // chaque voie porte les flèches de tous les virages qui la couvrent ; sont « sélectionnées »
    // celles du virage emprunté. Angle : 0 tout droit, négatif à gauche, ±180 demi-tour ;
    // voie 0 = la plus à gauche (mesuré sur WME le 25/09 : +45 = virage mesuré +28°, à droite).
    function voiesManoeuvre(R, i, idxVoies) {
        if (i + 1 >= R.length) return null;
        const p = R[i].path;
        const tours = idxVoies.get(p.segmentId + '|' + p.direction);
        if (!tours || !tours.length) return null;
        const vers = R[i + 1].path.segmentId;
        let n = 0;
        for (const tu of tours) n = Math.max(n, tu.lanes.toLaneIndex + 1);
        try {
            const s = sdk.DataModel.Segments.getById({ segmentId: p.segmentId });
            if (s) n = Math.max(n, (p.direction ? s.toNodeLanesCount : s.fromNodeLanesCount) || 0);
        } catch (e) { }
        const voies = Array.from({ length: n }, () => []);
        let choisie = false;
        for (const tu of tours) {
            const a = tu.lanes.angleOverride != null ? tu.lanes.angleOverride : tu.lanes.arrowAngle;
            const sel = tu.toSegmentId === vers;
            choisie = choisie || sel;
            for (let v = tu.lanes.fromLaneIndex; v <= tu.lanes.toLaneIndex && v < n; v++) {
                const deja = voies[v].find(x => x.a === a);
                if (deja) deja.sel = deja.sel || sel; else voies[v].push({ a, sel });
            }
        }
        return choisie ? voies : null;
    }

    // n : rang de l'itinéraire dans la réponse (0 = celui que l'appli propose d'office).
    function analyser(j, n) {
        const alt = j.alternatives && j.alternatives[n || 0];
        const r = n ? alt && alt.response : j.response || (alt && alt.response);
        const coords = (n ? alt && alt.coords : j.coords || (alt && alt.coords)) || [];
        if (!r || !r.results) throw new Error('no route');
        const R = r.results, noms = r.streetNames || [];
        const tgs = lireGuidages();
        const idxVoies = lireVoies();
        const man = [];
        const vitesses = [];                 // [début, fin, km/h] de chaque tronçon, le long du trajet
        let cumul = 0, prec = 0;
        for (let i = 0; i < R.length; i++) {
            const lg = R[i].length || 0;
            vitesses.push([cumul, cumul + lg, R[i].crossTime > 0 ? lg / R[i].crossTime * 3.6 : 0]);
            cumul += lg;
            const ins = R[i].instruction;
            const op = ins && ins.opcode;
            if (!op || op === 'NONE' || op === 'ROUNDABOUT_EXIT') continue;
            const dernier = i === R.length - 1;
            const lieu = dernier ? coords[coords.length - 1] : R[i + 1].path;
            // Le panneau du serveur d'abord : il vaut pour tout le trajet, chargé ou non, et c'est celui
            // de la carte publiée. L'instruction lue dans WME reste la source du texte vocal
            // personnalisé, et la seule preuve qu'un éditeur l'a posée (✎).
            const tgWme = dernier ? null : guidageManoeuvre(R, i, op, tgs);
            const tg = dernier ? null : (panneauServeur(R[i].roadSign, tgWme && tgWme.tts) || tgWme);
            // Dans un rond-point, la rue annoncée est celle d'après la sortie : l'anneau n'a pas de
            // nom et peut compter plus de segments que la tolérance de rueSuivante.
            const sortie = op.startsWith('ROUNDABOUT_') ? indexSortie(R, i) : -1;
            const apres = (sortie >= 0 ? sortie : i) + 1;
            man.push({
                op, arg: ins.arg || 0, rue: rueSuivante(R, noms, sortie >= 0 ? sortie : i), tg, perso: !!tgWme, i, sortie,
                lon: lieu.x, lat: lieu.y, depuisDepart: cumul, troncon: cumul - prec,
                feu: !!(ins.landmark && ins.landmark.trafficLight),
                ecusson: dernier ? null : ecussonRue(R, apres),
                ecussonSrv: dernier ? null : ecussonServeur(R, apres),
                bretelle: !dernier && apres < R.length && R[apres].roadType === 4,
                voies: dernier ? null : voiesManoeuvre(R, i, idxVoies),
            });
            prec = cumul;
        }
        if (!man.length || man[man.length - 1].op !== 'APPROACHING_DESTINATION') {
            const f = coords[coords.length - 1];
            if (f) man.push({ op: 'APPROACHING_DESTINATION', arg: 0, rue: noms[R[R.length - 1].street] || '', tg: null, lon: f.x, lat: f.y, depuisDepart: cumul, troncon: cumul - prec });
        }
        const tr = { manoeuvres: man, metres: cumul, secondes: r.totalRouteTime || 0, coords: coords.map(c => [c.x, c.y]), vitesses };
        tr.fiche = ficheTrajet(r);
        if (r.timeZone) fuseauLieu = r.timeZone;
        tr.lht = conduiteAGauche(r);
        for (const m of man) m.lht = tr.lht;
        tr.R = R;
        tr.zones = portionsEnZone(R, coords);
        tr.annonces = planifierAnnonces(tr);
        return tr;
    }

    // Sens de circulation du pays d'arrivée ; à défaut, celui du pays affiché.
    function conduiteAGauche(r) {
        try {
            const id = r.destinationInformation && r.destinationInformation.countryId;
            const pays = id != null && pw.W.model.countries.getObjectById(id);
            if (pays) return !!(pays.attributes ? pays.attributes.leftHandTraffic : pays.getAttribute('leftHandTraffic'));
        } catch (e) { }
        try { return !!sdk.DataModel.Countries.getTopCountry().isLeftHandTraffic; } catch (e) { return false; }
    }

    // La fiche du trajet, comme l'appli la montre avant de partir (« 42 min · Péage ~ 3,50 € · 53 km / — la
    // réponse ne dit pas la devise : le prix s'affiche sans symbole,
    // Via A9; A7 »), plus ce que la réponse dit des zones : celles traversées (areas), celles que le
    // trajet devrait éviter (areasToAvoid), les permis qu'il suppose, et s'il a dû contourner.
    function ficheTrajet(r) {
        const zones = Array.isArray(r.areas) ? r.areas : [];
        const aEviter = Array.isArray(r.areasToAvoid) ? r.areasToAvoid : [];
        const attr = Array.isArray(r.routeAttr) ? r.routeAttr : [];
        return {
            via: r.routeName || '',
            peage: r.tollPrice > 0 ? r.tollPrice : (r.tollMeters > 0 ? 0 : null),   // 0 = péage de prix inconnu
            peageMetres: r.tollMeters || 0,
            zones: zones.map(n => ({ nom: n, eviter: aEviter.includes(n) })),
            permis: Array.isArray(r.requiredPermits) ? r.requiredPermits : [],
            passTrajet: Array.isArray(r.allRoutePermits) ? r.allRoutePermits : [],
            contourne: !!r.isRestricted && !!r.dueToOverride,
            nonRevetu: attr.includes('Unpaved'),
        };
    }

    // Les portions du tracé qui passent dans une zone : le nœud d'entrée de chaque tronçon
    // (results[i].path) est un point du tracé, dans l'ordre — vérifié sur 120 tronçons sur 120.
    function portionsEnZone(R, coords) {
        const idx = [];
        let k = 0;
        for (const x of R) {
            const p = x.path || {};
            while (k < coords.length && !(Math.abs(coords[k].x - p.x) < 1e-6 && Math.abs(coords[k].y - p.y) < 1e-6)) k++;
            if (k >= coords.length) return [];          // tracé et tronçons désaccordés : ne rien peindre de faux
            idx.push(k);
        }
        idx.push(coords.length - 1);
        const out = [];
        let cur = null;
        R.forEach((x, i) => {
            const nom = Array.isArray(x.areas) && x.areas.length ? x.areas.join(', ') : '';
            if (!nom) { cur = null; return; }
            const pts = coords.slice(idx[i], idx[i + 1] + 1).map(c => [c.x, c.y]);
            if (cur && cur.nom === nom) cur.pts.push(...pts.slice(1));
            else { cur = { nom, pts }; out.push(cur); }
        });
        return out.filter(z => z.pts.length > 1);
    }

    // =====================================================================
    //  Ce que dit et ce que montre chaque instruction
    // =====================================================================

    //  Règles reprises de l'appli Waze 5.24 (décompilée, cf. docs/appli-waze) :
    //  - l'écran n'affiche AUCUNE phrase : icône + distance + (panneau du virage OU nom de rue) ;
    //  - KEEP et EXIT ont la même icône ; SLIGHT, SHARP, PREPARE n'ont ni icône ni son ;
    //  - un écusson est une IMAGE rendue par le serveur de Waze à partir de (type, texte).

    // Icône de manœuvre, dessinée ici (même vocabulaire que l'appli, pas ses images).
    // c = couleur du tracé, anneau = couleur de l'anneau des ronds-points.
    // Anneau des ronds-points sur fond sombre : #4B5459 mesuré sur les icônes « car_dark » de l'appli.
    const ANNEAU_SOMBRE = '#4b5459';
    let idDegrade = 0;                 // les dégradés vivent dans le document : un id par icône
    // Conduite à gauche (Royaume-Uni, Irlande…) : l'appli a des icônes « _uk » qui sont les MIROIRS des
    // icônes continentales de la direction opposée (vérifié sur ses images) : le « à droite » britannique
    // fait presque le tour par la gauche. Seul le numéro de sortie reste à l'endroit.
    const OPPOSE = { ROUNDABOUT_RIGHT: 'ROUNDABOUT_LEFT', ROUNDABOUT_LEFT: 'ROUNDABOUT_RIGHT' };
    function icone(m, taille, c, anneau) {
        if (m.lht && m.op !== 'ROUNDABOUT_ENTER' && (m.op.startsWith('ROUNDABOUT_') || m.op === 'UTURN')) {
            const inv = icone(Object.assign({}, m, { op: OPPOSE[m.op] || m.op, lht: false }), taille, c, anneau);
            return inv.replace(/^(<svg[^>]*>)([\s\S]*)(<\/svg>)$/, '$1<g transform="translate(48 0) scale(-1 1)">$2</g>$3');
        }
        const tete = (x, y, a) => {       // pointe en (x, y), orientée a degrés (0 = haut, 90 = droite)
            const r = a * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r);
            const bx = x - dx * 10, by = y - dy * 10, px = -dy * 7.5, py = dx * 7.5;
            return '<path d="M' + x + ' ' + y + 'L' + (bx + px).toFixed(1) + ' ' + (by + py).toFixed(1) + 'L' + (bx - px).toFixed(1) + ' ' + (by - py).toFixed(1) + 'Z" fill="' + c + '" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>';
        };
        const trait = d => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>';
        const miroir = s => '<g transform="translate(48 0) scale(-1 1)">' + s + '</g>';
        const rond = (arc, fin) => '<circle cx="24" cy="23" r="9" fill="none" stroke="' + anneau + '" stroke-width="5.5"/>' + trait('M24 44 V32 ' + arc) + fin;
        // Anneau numéroté : cercle sombre et trois traînées claires qui s'estompent dans le sens des
        // aiguilles d'une montre — la circulation va en sens inverse. Tête arrondie aux angles 310°,
        // 70° et 190° (0 = haut), plein sur 50°, fondu sur 65°. Mesures faites sur l'image 210 px de l'appli.
        const anneauNumerote = n => {
            const R = 11.4, cx = 24, cy = 24, pt = a => [cx + R * Math.sin(a * Math.PI / 180), cy - R * Math.cos(a * Math.PI / 180)];
            let z = '<circle cx="24" cy="24" r="' + R + '" fill="none" stroke="' + anneau + '" stroke-width="4.6"/>', defs = '';
            // Un arc de 115° par traînée, peint par un dégradé tendu de la tête à la queue : sur moins
            // d'un demi-tour, la corde suit l'arc dans le même ordre, le fondu est donc continu.
            for (const t0 of [310, 70, 190]) {
                const id = 'wrp-g' + (++idDegrade);
                const [x1, y1] = pt(t0), [xm, ym] = pt(t0 + 50), [x2, y2] = pt(t0 + 115);
                // Fin du plein, projetée sur la corde : c'est ainsi que le dégradé la mesure.
                const d1 = ((xm - x1) * (x2 - x1) + (ym - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2);
                defs += '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '">' +
                    '<stop offset="' + d1.toFixed(2) + '" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient>';
                z += '<path d="M' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A' + R + ' ' + R + ' 0 0 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
                    '" fill="none" stroke="url(#' + id + ')" stroke-width="4.6" stroke-linecap="round"/>';
            }
            if (m.lht) z = miroir(z);
            return '<defs>' + defs + '</defs>' + z + '<text x="24" y="24" dy=".36em" text-anchor="middle" font-size="12.5" font-weight="400" font-family="Roboto,Rubik,Arial,sans-serif" fill="' + c + '">' + (n || '') + '</text>';
        };
        let s;
        switch (m.op) {
            case 'CONTINUE': s = trait('M24 44 V13') + tete(24, 4, 0); break;
            case 'TURN_RIGHT': s = trait('M16 44 V27 Q16 16 27 16 H34') + tete(44, 16, 90); break;
            case 'TURN_LEFT': s = miroir(trait('M16 44 V27 Q16 16 27 16 H34') + tete(44, 16, 90)); break;
            case 'KEEP_RIGHT': case 'EXIT_RIGHT':
                s = '<path d="M18 44 V6" stroke="' + c + '" stroke-opacity=".3" stroke-width="5.5" stroke-linecap="round"/>' + trait('M18 44 V31 Q18 25 23 20 L30 13') + tete(37, 6, 45); break;
            case 'KEEP_LEFT': case 'EXIT_LEFT':
                s = miroir('<path d="M18 44 V6" stroke="' + c + '" stroke-opacity=".3" stroke-width="5.5" stroke-linecap="round"/>' + trait('M18 44 V31 Q18 25 23 20 L30 13') + tete(37, 6, 45)); break;
            case 'UTURN': s = trait('M32 44 V20 Q32 9 22 9 Q12 9 12 20 V31') + tete(12, 42, 180); break;
            case 'ROUNDABOUT_RIGHT': s = rond('A9 9 0 0 0 33 23 H36', tete(45, 23, 90)); break;
            case 'ROUNDABOUT_STRAIGHT': s = rond('A9 9 0 0 0 24 14 V12', tete(24, 3, 0)); break;
            case 'ROUNDABOUT_LEFT': s = rond('A9 9 0 1 0 15 23 H12', tete(3, 23, -90)); break;
            case 'ROUNDABOUT_U': s = rond('A9 9 0 1 0 17.6 29.4 V35', tete(17.6, 45, 180)); break;
            case 'ROUNDABOUT_ENTER': s = anneauNumerote(m.arg); break;
            // Arrivée : l'épingle à damier de l'appli (big_direction_end).
            case 'APPROACHING_DESTINATION': {
                s = '<path d="M24 46 C24 46 10 31 10 19 A14 14 0 1 1 38 19 C38 31 24 46 24 46Z" fill="' + c + '"/>' +
                    '<clipPath id="wrp-dam' + (++idDegrade) + '"><circle cx="24" cy="19" r="10.5"/></clipPath><g clip-path="url(#wrp-dam' + idDegrade + ')">';
                for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) {
                    if ((r + q) % 2) s += '<rect x="' + (13.5 + q * 3.5) + '" y="' + (8.5 + r * 3.5) + '" width="3.5" height="3.5" fill="#1b1f24"/>';
                }
                s += '</g>';
                break;
            }
            default: return '';
        }
        return '<svg viewBox="0 0 48 48" width="' + taille + '" height="' + taille + '" aria-hidden="true">' + s + '</svg>';
    }

    // Écusson ou panneau de sortie : image du serveur de rendu de Waze, celui qu'utilisent WME
    // et l'appli (PNG de 50 px de haut). Un type sans texte (pictogramme) se demande sans « text ».
    function urlEcusson(type, texte) {
        const env = envWaze();
        const hote = env === 'NA' ? 'am' : env === 'IL' ? 'il' : 'row';
        return 'https://renderer-' + hote + '.waze.com/renderer/v1/signs/' + encodeURIComponent(type) + (texte ? '?text=' + encodeURIComponent(texte) : '');
    }
    // h = hauteur VISIBLE voulue. Un écusson n'occupe que 28 px des 50 de l'image (mesuré : bande
    // 11-39 px) : on agrandit l'image et on rogne le vide par des marges négatives. Un panneau de
    // sortie remplit, lui, toute son image.
    function imgEcusson(x, h, sortie) {
        const txt = x.signText || x.description || '';
        const ih = sortie ? h : Math.round(h * 50 / 28), mg = sortie ? 0 : -Math.round((ih - h) / 2);
        return '<img class="wrp-sh" style="height:' + ih + 'px;margin:' + mg + 'px ' + (sortie ? 0 : -Math.round(ih * 0.04)) + 'px" src="' +
            esc(urlEcusson(x.id, txt)) + '" alt="' + esc(txt) + '" title="' + esc(txt) + '">';
    }

    // Règle officielle (« Roadshield - How To », Waze 08/2025) : sans instruction de virage,
    // l'écusson de la rue remplace son nom si le nom est simple (pas « X / Y »), fait au plus 2 mots
    // et que l'un d'eux contient le numéro ; jamais quand on y arrive par une bretelle.
    function ecussonRemplaceNom(m) {
        const e = m.ecusson;
        if (!e || !e.signText || m.bretelle) return false;
        const nom = (e.nom || '').trim();
        if (!nom || nom.includes('/')) return false;
        const mots = nom.split(/\s+/);
        const num = e.signText.toLowerCase();
        return mots.length <= 2 && mots.some(w => w.toLowerCase().includes(num));
    }

    // Les deux lignes du bandeau, comme l'appli les compose (navbar.f.k()) :
    //  panneau du virage → ligne principale = instruction visuelle, ligne 2 = « en direction de » ;
    //  sinon écusson de la rue (règle ci-dessus), sinon nom de rue.
    // Un écusson = image, sa direction reste en texte après. h = hauteur des images.
    // liste = true : la liste « Étapes suivantes », qui retombe sur l'adresse quand le panneau n'a pas de
    // ligne principale ; le bandeau, lui, laisse alors la ligne vide et ne montre que la direction.
    function lignes(m, h, liste) {
        const vi = m.tg && Array.isArray(m.tg.visualInstruction) ? m.tg.visualInstruction.filter(x => x) : [];
        const bout = x => (typeof x === 'object')
            ? imgEcusson(x, h) + (x.direction ? ' <span>' + esc(x.direction) + '</span>' : '')
            : '<span>' + esc(x) + '</span>';
        let l1 = '';
        if (vi.length) l1 = vi.map(bout).join(' ');
        else if (m.tg && m.tg.serveur && !liste && m.tg.towards.length) l1 = '';
        else if (m.op !== 'APPROACHING_DESTINATION' && m.ecussonSrv && !m.bretelle) l1 = bout(m.ecussonSrv);
        else if (m.op !== 'APPROACHING_DESTINATION' && ecussonRemplaceNom(m)) l1 = bout(m.ecusson);
        else if (m.op !== 'APPROACHING_DESTINATION') l1 = esc(m.rue || '');
        // Chaque direction est un texte, un écusson, ou une suite des deux (panneau du serveur) :
        // ses écussons se dessinent comme ceux de la ligne principale.
        const dirs = m.tg && Array.isArray(m.tg.towards) ? m.tg.towards : [];
        let l2 = dirs.map(d => (Array.isArray(d) ? d : [d]).filter(x => x).map(bout).join(' ')).filter(x => x).join(', ');
        // Écusson seul, sans texte : la ligne « en direction de » remonte à côté (règle officielle).
        if (vi.length && vi.every(x => typeof x === 'object') && l2) { l1 += ' <span class="wrp-cote">' + l2 + '</span>'; l2 = ''; }
        const sorties = m.tg && Array.isArray(m.tg.exitSigns) ? m.tg.exitSigns.map(x => imgEcusson(x, Math.round(h * 1.1), true)).join('') : '';
        return { l1, l2, sorties };
    }

    // Bande de voies (appli : ui.navbar.a) : flèches à tronc vertical puis courbe vers l'angle ;
    // non sélectionnées #797979 dessinées d'abord, sélectionnées blanches par-dessus ; demi-tour en
    // crochet ; séparateurs gris sur 28 % de la hauteur.
    function voiesSVG(voies, h) {
        const fleche = (a, c) => {
            if (Math.abs(a) >= 170) {
                return '<path d="M25 37 V20 Q25 11 18 11 Q11 11 11 20 V25" fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>' +
                    '<path d="M11 33 L5.5 24 H16.5 Z" fill="' + c + '"/>';
            }
            const r = a * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r);
            const ex = 20 + dx * 14, ey = 20 + dy * 14;              // pointe (pivot en 20,20)
            const lx = ex - dx * 6, ly = ey - dy * 6;                  // fin du trait, sous la pointe
            const px = -dy * 5.5, py = dx * 5.5;
            return '<path d="M20 37 V27 Q20 20 ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + '" fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>' +
                '<path d="M' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L' + (lx + px).toFixed(1) + ' ' + (ly + py).toFixed(1) + ' L' + (lx - px).toFixed(1) + ' ' + (ly - py).toFixed(1) + ' Z" fill="' + c + '"/>';
        };
        const n = voies.length, w = 40 * n;
        let s = '';
        voies.forEach((v, i) => {
            s += '<g transform="translate(' + (i * 40) + ' 0)">' +
                v.filter(x => !x.sel).map(x => fleche(x.a, '#797979')).join('') +
                v.filter(x => x.sel).map(x => fleche(x.a, '#ffffff')).join('') + '</g>';
            if (i) s += '<rect x="' + (i * 40 - 0.5) + '" y="' + (40 - 6 - 11) + '" width="1" height="11" fill="#797979"/>';
        });
        return '<svg viewBox="0 0 ' + w + ' 40" width="' + Math.round(w * h / 40) + '" height="' + h + '" aria-hidden="true">' + s + '</svg>';
    }


    // =====================================================================
    //  PHRASES DITES — dans la langue de la VOIX (celle du pays), pas celle de l'interface
    // =====================================================================
    //  Sources, par ordre de fiabilité :
    //   - anglais : les morceaux réels de la voix de l'appli (key_value_tts_strings.txt de l'APK 5.24) ;
    //   - français : les phrases de WRP, validées par l'auteur sur des trajets réels ;
    //   - consignes simples des autres langues : les traductions OFFICIELLES de Waze, relevées dans la
    //     page de l'éditeur de chaque langue (turn_tooltip.instruction_override.opcodes, 25/09/2026,
    //     docs/opcodes-wme-2026-09-25.json) ;
    //   - le reste (ronds-points, ordinaux, distances, « puis », arrivée) : nos formules, NON vérifiées
    //     sur l'appli — son texte n'est pas embarqué, elle le télécharge.
    const ORDX = {
        de: ['erste', 'zweite', 'dritte', 'vierte', 'fünfte', 'sechste', 'siebte', 'achte', 'neunte', 'zehnte'],
        es: ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'],
        it: ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima', 'ottava', 'nona', 'decima'],
        pt: ['primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta', 'sétima', 'oitava', 'nona', 'décima'],
        nl: ['eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde', 'zevende', 'achtste', 'negende', 'tiende'],
        he: ['הראשונה', 'השנייה', 'השלישית', 'הרביעית', 'החמישית', 'השישית', 'השביעית', 'השמינית', 'התשיעית', 'העשירית'],
    };
    const ord = (l, n) => (ORDX[l] && ORDX[l][n - 1]) || String(n);
    // Paliers de l'appli : 200, 400, 800, 1 000, 1 500 m.
    const paliers = (m, km, km15) => d => d === 1000 ? km : d === 1500 ? km15 : m.replace('#', d);

    const PHR = {
        en: {
            ops: {
                TURN_LEFT: 'Turn left', TURN_RIGHT: 'Turn right', KEEP_LEFT: 'Stay to the left', KEEP_RIGHT: 'Stay to the right',
                EXIT_LEFT: 'Exit left', EXIT_RIGHT: 'Exit right', UTURN: 'Make a u-turn', CONTINUE: 'Continue straight',
                ROUNDABOUT_LEFT: 'At the roundabout, turn left', ROUNDABOUT_RIGHT: 'At the roundabout, turn right',
                ROUNDABOUT_STRAIGHT: 'At the roundabout, continue straight', ROUNDABOUT_U: 'At the roundabout, make a u-turn',
                APPROACHING_DESTINATION: 'You\'ve arrived',
            },
            rbExit: n => 'At the roundabout, take the ' + (ORD.en[n - 1] || n + 'th') + ' exit',
            onto: x => ' on ' + x,
            // En impérial, l'appli dit 500 ft / ¼ / ½ / 0,6 / 1 mile aux MÊMES distances.
            inDist: d => imperial()
                ? ({ 200: 'In 500 feet', 400: 'In a quarter of a mile', 800: 'In half a mile', 1000: 'In 0.6 miles', 1500: 'In 1 mile' }[d] || 'In ' + d + ' meters')
                : ({ 1000: 'In one kilometer', 1500: 'In one point five kilometers' }[d] || 'In ' + d + ' meters'),
            then: 'then',
        },
        de: {
            ops: {
                TURN_LEFT: 'Biege links ab', TURN_RIGHT: 'Biege rechts ab', KEEP_LEFT: 'Links halten', KEEP_RIGHT: 'Rechts halten',
                EXIT_LEFT: 'Nimm die Ausfahrt links', EXIT_RIGHT: 'Nimm die Ausfahrt rechts', UTURN: 'Wenden', CONTINUE: 'Weiter geradeaus',
                ROUNDABOUT_LEFT: 'Im Kreisverkehr biege links ab', ROUNDABOUT_RIGHT: 'Im Kreisverkehr biege rechts ab',
                ROUNDABOUT_STRAIGHT: 'Im Kreisverkehr weiter geradeaus', ROUNDABOUT_U: 'Im Kreisverkehr wenden',
                APPROACHING_DESTINATION: 'Du hast dein Ziel erreicht',
            },
            rbExit: n => 'Im Kreisverkehr nimm die ' + ord('de', n) + ' Ausfahrt',
            // « dann du hast dein Ziel erreicht » était agrammatical : verbe en 2e position après « dann ».
            thenArrive: 'dann erreichst du dein Ziel',
            onto: x => ' auf ' + x,
            inDist: paliers('In # Metern', 'In einem Kilometer', 'In 1,5 Kilometern'),
            then: 'dann',
        },
        es: {
            ops: {
                TURN_LEFT: 'Gira a la izquierda', TURN_RIGHT: 'Gira a la derecha', KEEP_LEFT: 'Mantente a la izquierda', KEEP_RIGHT: 'Mantente a la derecha',
                EXIT_LEFT: 'Sal a la izquierda', EXIT_RIGHT: 'Sal a la derecha', UTURN: 'Cambio de sentido', CONTINUE: 'Continuar',
                ROUNDABOUT_LEFT: 'En la rotonda, gira a la izquierda', ROUNDABOUT_RIGHT: 'En la rotonda, gira a la derecha',
                ROUNDABOUT_STRAIGHT: 'En la rotonda, sigue recto', ROUNDABOUT_U: 'En la rotonda, cambia de sentido',
                APPROACHING_DESTINATION: 'Has llegado a tu destino',
            },
            rbExit: n => 'En la rotonda, toma la ' + ord('es', n) + ' salida',
            onto: x => ' hacia ' + x,
            inDist: paliers('En # metros', 'En un kilómetro', 'En 1,5 kilómetros'),
            then: 'después',
        },
        it: {
            ops: {
                TURN_LEFT: 'Svoltare a sinistra', TURN_RIGHT: 'Svoltare a destra', KEEP_LEFT: 'Tenersi a sinistra', KEEP_RIGHT: 'Tenersi a destra',
                EXIT_LEFT: 'Uscire a sinistra', EXIT_RIGHT: 'Uscire a destra', UTURN: 'Inversione a U', CONTINUE: 'Continua',
                ROUNDABOUT_LEFT: 'Alla rotatoria, svoltare a sinistra', ROUNDABOUT_RIGHT: 'Alla rotatoria, svoltare a destra',
                ROUNDABOUT_STRAIGHT: 'Alla rotatoria, proseguire dritto', ROUNDABOUT_U: 'Alla rotatoria, inversione a U',
                APPROACHING_DESTINATION: 'Sei arrivato a destinazione',
            },
            rbExit: n => 'Alla rotatoria, prendere la ' + ord('it', n) + ' uscita',
            onto: x => ' su ' + x,
            inDist: paliers('Tra # metri', 'Tra un chilometro', 'Tra 1,5 chilometri'),
            then: 'poi',
        },
        'pt-BR': {
            ops: {
                TURN_LEFT: 'Vire à esquerda', TURN_RIGHT: 'Vire à direita', KEEP_LEFT: 'Mantenha-se à esquerda', KEEP_RIGHT: 'Mantenha-se à direita',
                EXIT_LEFT: 'Saia à esquerda', EXIT_RIGHT: 'Saia à direita', UTURN: 'Retorne', CONTINUE: 'Siga em frente',
                ROUNDABOUT_LEFT: 'Na rotatória, vire à esquerda', ROUNDABOUT_RIGHT: 'Na rotatória, vire à direita',
                ROUNDABOUT_STRAIGHT: 'Na rotatória, siga em frente', ROUNDABOUT_U: 'Na rotatória, retorne',
                APPROACHING_DESTINATION: 'Você chegou ao seu destino',
            },
            rbExit: n => 'Na rotatória, pegue a ' + ord('pt', n) + ' saída',
            onto: x => ' para ' + x,
            inDist: paliers('Em # metros', 'Em um quilômetro', 'Em 1,5 quilômetro'),
            then: 'depois',
        },
        'pt-PT': {
            ops: {
                TURN_LEFT: 'Vire à esquerda', TURN_RIGHT: 'Vire à direita', KEEP_LEFT: 'Mantenha-se à esquerda', KEEP_RIGHT: 'Mantenha-se à direita',
                EXIT_LEFT: 'Saia à esquerda', EXIT_RIGHT: 'Saia à direita', UTURN: 'Faça inversão de marcha', CONTINUE: 'Continue',
                ROUNDABOUT_LEFT: 'Na rotunda, vire à esquerda', ROUNDABOUT_RIGHT: 'Na rotunda, vire à direita',
                ROUNDABOUT_STRAIGHT: 'Na rotunda, siga em frente', ROUNDABOUT_U: 'Na rotunda, faça inversão de marcha',
                APPROACHING_DESTINATION: 'Chegou ao seu destino',
            },
            rbExit: n => 'Na rotunda, saia na ' + ord('pt', n) + ' saída',
            onto: x => ' para ' + x,
            inDist: paliers('Dentro de # metros', 'Dentro de um quilómetro', 'Dentro de 1,5 quilómetros'),
            then: 'depois',
        },
        nl: {
            ops: {
                TURN_LEFT: 'Links afslaan', TURN_RIGHT: 'Rechts afslaan', KEEP_LEFT: 'Links aanhouden', KEEP_RIGHT: 'Rechts aanhouden',
                EXIT_LEFT: 'Afrit links', EXIT_RIGHT: 'Afrit rechts', UTURN: 'Omkeren', CONTINUE: 'Ga rechtdoor',
                ROUNDABOUT_LEFT: 'Op de rotonde linksaf', ROUNDABOUT_RIGHT: 'Op de rotonde rechtsaf',
                ROUNDABOUT_STRAIGHT: 'Op de rotonde rechtdoor', ROUNDABOUT_U: 'Op de rotonde omkeren',
                APPROACHING_DESTINATION: 'U bent aangekomen',
            },
            rbExit: n => 'Neem op de rotonde de ' + ord('nl', n) + ' afslag',
            // « daarna u bent aangekomen » était agrammatical : inversion après « daarna ».
            thenArrive: 'daarna bent u aangekomen',
            onto: x => ' naar ' + x,
            inDist: paliers('Over # meter', 'Over een kilometer', 'Over 1,5 kilometer'),
            then: 'daarna',
        },
        he: {
            ops: {
                TURN_LEFT: 'פנה שמאלה', TURN_RIGHT: 'פנה ימינה', KEEP_LEFT: 'להיצמד לשמאל', KEEP_RIGHT: 'להיצמד לימין',
                EXIT_LEFT: 'צא שמאלה', EXIT_RIGHT: 'צא ימינה', UTURN: 'פניית פרסה', CONTINUE: 'המשך',
                ROUNDABOUT_LEFT: 'בכיכר, פנה שמאלה', ROUNDABOUT_RIGHT: 'בכיכר, פנה ימינה',
                ROUNDABOUT_STRAIGHT: 'בכיכר, המשך ישר', ROUNDABOUT_U: 'בכיכר, בצע פניית פרסה',
                APPROACHING_DESTINATION: 'הגעת ליעד',
            },
            rbExit: n => 'בכיכר, צא ביציאה ' + ord('he', n),
            onto: x => ' אל ' + x,
            inDist: paliers('בעוד # מטר', 'בעוד קילומטר', 'בעוד קילומטר וחצי'),
            then: 'ואז',
        },
    };
    // Le français reprend les phrases de l'interface, déjà éprouvées.
    PHR.fr = { ops: DICO.fr.ops, rbExit: DICO.fr.rbExit, onto: DICO.fr.onto, inDist: DICO.fr.inDist, then: DICO.fr.then };

    // Langue des phrases : celle de la voix choisie pour le pays (fr-FR → fr, pt-BR → pt-BR, en-GB → en),
    // à défaut celle de l'interface.
    function languePhrases() {
        const v = localeVoix();
        if (PHR[v]) return v;
        const l = v.slice(0, 2);
        if (l === 'pt') return 'pt-BR';
        return PHR[l] ? l : (PHR[_lang] ? _lang : 'en');
    }
    const P = () => PHR[languePhrases()];
    const minuscule = x => x.charAt(0).toLowerCase() + x.slice(1);

    function verbe(m) {
        const L = P();
        if (m.op === 'ROUNDABOUT_ENTER') return L.rbExit(m.arg);
        return L.ops[m.op] || PHR.en.ops[m.op] || m.op.toLowerCase().replace(/_/g, ' ');
    }

    // Phrase dite : le texte vocal personnalisé du virage remplace le nom de la rue. On va SUR une
    // route, rond-point compris. Les « : » d'un texte vocal (« D26: Donzère ») sont lus par le moteur
    // de la voix lui-même comme « en direction de » : le texte part tel quel.
    function phrase(m) {
        let p = verbe(m);
        if (m.op === 'APPROACHING_DESTINATION') return p;
        const dit = m.tg && m.tg.tts ? m.tg.tts : m.rue;
        if (dit) p += P().onto(dit);
        return p;
    }

    // =====================================================================
    //  Annonces vocales : le planificateur local de l'appli (com.waze.sound.ci)
    // =====================================================================
    //  Pour chaque manœuvre, sur le tronçon qui la précède (depuis la manœuvre précédente) :
    //   - 1 500, 1 000 et 800 m si la vitesse dépasse 70 km/h, 400 et 200 m toujours,
    //     chacun seulement si le tronçon est au moins aussi long ; la phrase COMMENCE à la distance ;
    //   - l'annonce au carrefour, qui doit être FINIE à 40 m ;
    //   - « puis » + instruction suivante si celle-ci est à 500 m ou moins.
    //  L'arrivée n'a que l'annonce finale. La vitesse est celle que prévoit l'itinéraire à
    //  l'endroit du palier (longueur / temps du tronçon) : l'appli, elle, prend la vitesse réelle.
    const PALIERS = [{ d: 1500, v: 70 }, { d: 1000, v: 70 }, { d: 800, v: 70 }, { d: 400, v: 0 }, { d: 200, v: 0 }];
    const FINALE = 40, PUIS_MAX = 500;

    function vitesseA(tr, pos) {
        for (const [a, b, v] of tr.vitesses) if (pos >= a && pos < b) return v;
        return 0;
    }

    function planifierAnnonces(tr) {
        const ms = tr.manoeuvres, res = [];
        ms.forEach((m, k) => {
            const suiv = ms[k + 1];
            // L'arrivée compte comme suivante : l'appli enchaîne alors « puis » + « vous êtes arrivé ».
            const puis = suiv && suiv.troncon <= PUIS_MAX ? suiv : null;
            if (m.op !== 'APPROACHING_DESTINATION') {
                for (const p of PALIERS) {
                    if (m.troncon < p.d) continue;
                    const v = vitesseA(tr, m.depuisDepart - p.d);
                    if (p.v && v <= p.v) continue;
                    res.push({ k, d: p.d, puis, v });
                }
            }
            res.push({ k, d: 0, puis: m.op === 'APPROACHING_DESTINATION' ? null : puis });
        });
        return res;
    }

    // Texte d'une annonce : [distance] + instruction (+ rue) + [puis + instruction suivante].
    function texteAnnonce(a) {
        const m = trajet.manoeuvres[a.k];
        let p = phrase(m);
        const L = P();
        if (a.d) p = L.inDist(a.d) + ', ' + minuscule(p);
        if (a.puis) p += ', ' + (a.puis.op === 'APPROACHING_DESTINATION' && L.thenArrive ? L.thenArrive : L.then + ' ' + minuscule(verbe(a.puis)));
        return p;
    }

    // =====================================================================
    //  La voix de Waze
    // =====================================================================

    // Voix choisie dans l'onglet Scripts ; « automatique » = celle de la langue de l'éditeur si le pays
    // la propose (ttsLocales), sinon la première du pays. Les phrases suivent toujours la voix.
    const VOIX = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'pt-BR', 'pt-PT', 'nl-NL', 'he-IL'];
    function localeVoix() {
        if (opts.voix && VOIX.includes(opts.voix)) return opts.voix;
        try {
            const c = sdk.DataModel.Countries.getTopCountry();
            const pays = pw.W.model.countries.getObjectById(c.id);
            const locs = (pays && (pays.attributes?.ttsLocales || pays.getAttribute?.('ttsLocales'))) || [];
            const m = locs.find(l => (l.locale || '').startsWith(_lang)) || locs[0];
            // ⚠️ La voix suit le pays (ttsLocales) : un éditeur à l'interface française qui essaie un
            // trajet en Allemagne entend la voix allemande — et les phrases suivent la voix.
            if (m && m.tts) return m.tts;
        } catch (e) { }
        return _lang === 'fr' ? 'fr-FR' : 'en-US';
    }

    async function urlVoix(texte, lon, lat) {
        const cle = localeVoix() + '|' + texte;
        if (cacheVoix.has(cle)) return cacheVoix.get(cle);
        const client = pw.W && pw.W.app && pw.W.app.descartesClient;
        if (!client || typeof client.convertTextToVoice !== 'function') return null;
        let u = null;
        try { u = await client.convertTextToVoice(' ' + texte + ' ', { lon, lat }, localeVoix()); } catch (e) { u = null; }
        if (u) cacheVoix.set(cle, u);
        return u;
    }

    // Une seule voix à la fois. Couper le son RÉSOUT la lecture en cours (à false) : sans cela, la boucle
    // de « Tout écouter » restait suspendue pour toujours sur une promesse abandonnée (audit, lot B).
    // audioGen change à chaque coupure : une voix dont l'adresse arrive APRÈS une coupure ne se fait pas entendre.
    let audio = null, finAudio = null, audioGen = 0;
    function couperAudio() {
        audioGen++;
        if (audio) { audio.pause(); audio = null; }
        if (finAudio) { const f = finAudio; finAudio = null; f(false); }
    }
    function jouer(url) {
        couperAudio();
        return new Promise(fin => {
            const termine = v => { if (finAudio === fin) finAudio = null; fin(v); };
            finAudio = fin;
            audio = new Audio(url);
            audio.onended = () => termine(true);
            audio.onerror = () => termine(false);
            audio.play().catch(() => termine(false));
        });
    }

    // Rend true (dite), false (coupée ou échouée) ou 'sansVoix' (aucune voix disponible ici).
    async function dire(a) {
        const m = trajet.manoeuvres[a.k];
        const g = audioGen;
        const u = await urlVoix(texteAnnonce(a), m.lon, m.lat);
        if (g !== audioGen) return false;                // coupé pendant qu'on obtenait la voix
        if (!u) { statutPassager(t('noVoice')); return 'sansVoix'; }
        return jouer(u);
    }

    // =====================================================================
    //  Drapeaux de départ (vert) et d'arrivée (damier) — A et B restent les clés internes
    // =====================================================================

    // Sur la carte, un liseré blanc détache le drapeau de la photo satellite, et un pied rond
    // marque le point exact.
    function drapeauSVG(k, h, carte) {
        let mat = '<path d="M4 2 V22" stroke="#37474f" stroke-width="2" stroke-linecap="round"/>';
        if (carte) mat = '<path d="M4 2 V22" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>' +
            '<path d="M5 3 H20 V12 H5 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>' +
            '<circle cx="4" cy="22" r="2.8" fill="#fff"/>' + mat + '<circle cx="4" cy="22" r="1.8" fill="#37474f"/>';
        let toile;
        if (k === 'A') toile = '<path d="M5 3 H19 L15.5 7.5 L19 12 H5 Z" fill="#43a047" stroke="#2e7d32" stroke-width="1" stroke-linejoin="round"/>';
        else {
            toile = '<rect x="5" y="3" width="15" height="9" fill="#fff" stroke="#263238" stroke-width="1"/>';
            for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
                if ((r + c) % 2 === 0) toile += '<rect x="' + (5 + c * 3) + '" y="' + (3 + r * 3) + '" width="3" height="3" fill="#263238"/>';
            }
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + h + '" height="' + h + '" viewBox="0 0 24 24" aria-hidden="true">' + mat + toile + '</svg>';
    }
    const TAILLE_DRAPEAU = 40;
    const drapeauURL = k => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(drapeauSVG(k, TAILLE_DRAPEAU, true));

    // =====================================================================
    //  Carte : trajet, manœuvres numérotées, départ et arrivée, repère
    // =====================================================================

    // ⚠️ pointerEvents: 'none' sur TOUS les styles : une feature SVG capte la souris sur sa surface peinte, et un
    // trajet affiché empêchait de sélectionner les segments et nœuds qu'on veut justement corriger (audit A1 ;
    // piège déjà vécu le 21/07 sur un autre script).
    function poserCalques() {
        try {
            // Les autres itinéraires, en gris SOUS le trajet choisi (posé avant lui).
            sdk.Map.addLayer({
                layerName: L_ALT,
                styleRules: [{ style: { strokeColor: '#78909c', strokeWidth: 5, strokeOpacity: 0.55, strokeLinecap: 'round', pointerEvents: 'none' } }],
            });
            sdk.Map.addLayer({
                layerName: L_ROUTE,
                styleRules: [{ style: { strokeColor: '#2196f3', strokeWidth: 7, strokeOpacity: 0.75, strokeLinecap: 'round', pointerEvents: 'none' } }],
            });
            // Portions en zone (ZFE, Crit'Air…) : orange par-dessus le bleu du trajet.
            sdk.Map.addLayer({
                layerName: L_ZONES,
                styleRules: [{ style: { strokeColor: '#fb8c00', strokeWidth: 7, strokeOpacity: 0.9, strokeLinecap: 'round', strokeDashstyle: 'dash', pointerEvents: 'none' } }],
            });
            sdk.Map.addLayer({
                layerName: L_POINTS,
                styleContext: { lbl: ctx => (ctx.feature.properties || {}).lbl || '', img: ctx => (ctx.feature.properties || {}).img || '' },
                styleRules: [
                    { predicate: pr => !pr.img, style: { pointRadius: 10, fillColor: '#ffffff', fillOpacity: 1, strokeColor: '#1565c0', strokeWidth: 2, label: '${lbl}', fontColor: '#1565c0', fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none' } },
                    // Le pied du mât est en (4, 22) sur 24 : on l'y cale, à l'échelle de l'image.
                    { predicate: pr => !!pr.img, style: { externalGraphic: '${img}', graphicWidth: TAILLE_DRAPEAU, graphicHeight: TAILLE_DRAPEAU,
                        graphicXOffset: -TAILLE_DRAPEAU * 4 / 24, graphicYOffset: -TAILLE_DRAPEAU * 22 / 24, graphicOpacity: 1, pointerEvents: 'none' } },
                ],
            });
            sdk.Map.addLayer({
                layerName: L_FLASH,
                styleRules: [{ style: { pointRadius: 16, fillOpacity: 0, strokeColor: '#ff00ff', strokeWidth: 4, strokeOpacity: 1, pointerEvents: 'none' } }],
            });
        } catch (e) { log('calques : ' + e.message); }
        appliquerVisibilite();
    }

    // Une case « WME Route Preview » dans le sélecteur de calques de WME montre ou masque le trajet (audit E3).
    // Un seul endroit écrit l'état : basculerCalques(). Un nouveau calcul réaffiche le trajet.
    // Fermer la fenêtre retire le trajet de la carte, la rouvrir le remontre (demande de l'auteur, 27/09 :
    // sinon rien ne l'enlevait). Mais un point posé ou un trajet calculé fenêtre fermée (ligne TRAJET du
    // panneau, raccourcis, ouverture au calcul coupée) se montre : c'est un geste nouveau, pas celui qu'on
    // a fermé. La case garde le choix de l'utilisateur.
    const CASE_CALQUES = SCRIPT_NAME;
    let calquesVisibles = true;
    let masqueParFermeture = true;
    function appliquerVisibilite() {
        const v = calquesVisibles && !masqueParFermeture;
        for (const l of [L_ALT, L_ROUTE, L_ZONES, L_POINTS, L_FLASH]) {
            try { sdk.Map.setLayerVisibility({ layerName: l, visibility: v }); } catch (e) { }
        }
    }
    function basculerCalques(on) {
        calquesVisibles = !!on;
        appliquerVisibilite();
        try {
            if (sdk.LayerSwitcher.isLayerCheckboxChecked({ name: CASE_CALQUES }) !== calquesVisibles) {
                sdk.LayerSwitcher.setLayerCheckboxChecked({ name: CASE_CALQUES, isChecked: calquesVisibles });
            }
        } catch (e) { }
    }
    function poserCaseCalques() {
        try {
            sdk.LayerSwitcher.addLayerCheckbox({ name: CASE_CALQUES });
            sdk.LayerSwitcher.setLayerCheckboxChecked({ name: CASE_CALQUES, isChecked: true });
            // L'événement part pour n'importe quel calque : on relit NOTRE case.
            sdk.Events.on({ eventName: 'wme-layer-checkbox-toggled', eventHandler: () => {
                let etat;
                try { etat = sdk.LayerSwitcher.isLayerCheckboxChecked({ name: CASE_CALQUES }); } catch (e) { return; }
                if (etat !== calquesVisibles) basculerCalques(etat);
            } });
        } catch (e) { log('case de calque : ' + e.message); }
    }

    function dessiner() {
        try {
            sdk.Map.removeAllFeaturesFromLayer({ layerName: L_ALT });
            sdk.Map.removeAllFeaturesFromLayer({ layerName: L_ROUTE });
            sdk.Map.removeAllFeaturesFromLayer({ layerName: L_ZONES });
            sdk.Map.removeAllFeaturesFromLayer({ layerName: L_POINTS });
        } catch (e) { }
        const feats = [];
        const autres = trajet ? trajets.filter(x => x !== trajet && x.coords.length > 1) : [];
        if (autres.length) {
            sdk.Map.addFeaturesToLayer({ layerName: L_ALT, features: autres.map((x, k) => ({ type: 'Feature', id: 'wrp-alt' + k, geometry: { type: 'LineString', coordinates: x.coords }, properties: {} })) });
        }
        if (trajet && trajet.coords.length > 1) {
            sdk.Map.addFeatureToLayer({ layerName: L_ROUTE, feature: { type: 'Feature', id: 'wrp-line', geometry: { type: 'LineString', coordinates: trajet.coords }, properties: {} } });
            if (trajet.zones && trajet.zones.length) {
                sdk.Map.addFeaturesToLayer({ layerName: L_ZONES, features: trajet.zones.map((z, i) => ({ type: 'Feature', id: 'wrp-z' + i, geometry: { type: 'LineString', coordinates: z.pts }, properties: {} })) });
            }
            trajet.manoeuvres.forEach((m, i) => {
                if (m.op === 'APPROACHING_DESTINATION') return;
                feats.push({ type: 'Feature', id: 'wrp-m' + i, geometry: { type: 'Point', coordinates: [m.lon, m.lat] }, properties: { lbl: String(i + 1) } });
            });
        }
        for (const k of ['A', 'B']) {
            if (pts[k]) feats.push({ type: 'Feature', id: 'wrp-' + k, geometry: { type: 'Point', coordinates: [pts[k].lon, pts[k].lat] }, properties: { img: drapeauURL(k) } });
        }
        if (feats.length) sdk.Map.addFeaturesToLayer({ layerName: L_POINTS, features: feats });
    }

    let flashTimer = null;
    function aller(m) {
        sdk.Map.setMapCenter({ lonLat: { lon: m.lon, lat: m.lat } });
        try {
            clearTimeout(flashTimer);
            sdk.Map.removeAllFeaturesFromLayer({ layerName: L_FLASH });
            sdk.Map.addFeatureToLayer({ layerName: L_FLASH, feature: { type: 'Feature', id: 'wrp-flash', geometry: { type: 'Point', coordinates: [m.lon, m.lat] }, properties: {} } });
            flashTimer = setTimeout(() => { try { sdk.Map.removeAllFeaturesFromLayer({ layerName: L_FLASH }); } catch (e) { } }, FLASH_MS);
        } catch (e) { }
    }

    // =====================================================================
    //  Onglet Scripts — mêmes codes que WME Closures Toolkit
    // =====================================================================

    // ⚠️ Pas d'accent grave dans ce bloc : il vit dans un template literal.
    const CSS = `
/* Bouton de la colonne de droite de WME : même gabarit que ceux de WCT et WNA. */
#wrp-fab-wrap { width: 40px; height: 40px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3);
    display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; transition: box-shadow .15s; }
#wrp-fab-wrap:hover { box-shadow: 0 3px 10px rgba(0,0,0,.4); }
#wrp-fab-btn { background: none; border: none; padding: 0; margin: 0; cursor: inherit; display: flex; align-items: center;
    justify-content: center; width: 100%; height: 100%; border-radius: 50%; }
#wrp-fab-btn.actif { background: #e3f2fd; }

/* La fenêtre : en-tête bleu déplaçable, points, bandeau FIXE, liste qui défile seule. */
#wrp-ov { position: fixed; z-index: 9989; display: none; flex-direction: column; width: 380px; min-width: 300px; min-height: 220px;
    background: #fff; border: 1px solid #dde3ea; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.12);
    overflow: hidden; font-family: 'Rubik','Open Sans',sans-serif; font-size: 12px; color: #2d3748; }
#wrp-ov.open { display: flex; }
#wrp-hdr { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px;
    background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%); color: #fff; cursor: move; user-select: none; }
.wrp-hdr-title { min-width: 0; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wrp-hdr-v { font-size: 11px; font-weight: 400; opacity: .9; margin-inline-start: 5px; }
.wrp-hdr-btn { flex-shrink: 0; width: 24px; height: 24px; min-height: 0; padding: 0; margin: 0; border: none; border-radius: 50%;
    background: rgba(255,255,255,.18); color: #fff; font-size: 12px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.wrp-hdr-btn:hover { background: rgba(255,255,255,.35); }
.wrp-hdr-btns { display: flex; gap: 5px; flex-shrink: 0; }
.wrp-hdr-btn[hidden] { display: none; }
.wrp-hdr-btn.wrp-hdr-maj { background: #e53935; }
.wrp-hdr-btn.wrp-hdr-maj:hover { background: #ef5350; }
.wrp-hdr-btn.wrp-hdr-maj svg { width: 14px; height: 14px; display: block; fill: currentColor; }
.wrp-hdr-ico { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-inline-end: 7px;
    border-radius: 50%; background: #fff; vertical-align: middle; }
.wrp-hdr-title { display: flex; align-items: center; }
#wrp-haut { flex-shrink: 0; padding: 8px 10px 6px; border-bottom: 1px solid #dde3ea; }
.wrp-pt { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.wrp-pt-champ { position: relative; flex: 1; min-width: 0; }
#wrp-ov .wrp-pt-lbl { box-sizing: border-box; width: 100%; height: 22px; margin: 0; padding: 2px 8px; border: 1px solid #dde3ea; border-radius: 8px;
    background: #f5f7f9; font: 11px 'Rubik','Open Sans',sans-serif; color: #2d3748; text-overflow: ellipsis; outline: none; }
#wrp-ov .wrp-pt-lbl:focus { background: #fff; border-color: #2196f3; }
#wrp-ov .wrp-pt-lbl::placeholder { color: #566372; font-style: italic; }
.wrp-sugg { position: absolute; left: 0; right: 0; top: 24px; z-index: 5; list-style: none; margin: 0; padding: 3px 0; max-height: 260px; overflow-y: auto;
    background: #fff; border: 1px solid #dde3ea; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.18); }
.wrp-sugg[hidden] { display: none; }
.wrp-sugg li { padding: 5px 9px; font-size: 11px; line-height: 1.35; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wrp-sugg li.sel, .wrp-sugg li[data-choix]:hover { background: #e3f2fd; }
.wrp-sugg li.wrp-sugg-vide { color: #9e9e9e; font-style: italic; cursor: default; }
.wrp-chip { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 22px; height: 22px;
    min-height: 0; padding: 0; margin: 0; border-radius: 50%; border: 1px solid #dde3ea; background: #fff; color: #1565c0;
    font: 700 11px 'Rubik','Open Sans',sans-serif; line-height: 1; cursor: pointer; }
.wrp-chip:hover { background: #2196f3; border-color: #2196f3; color: #fff; }
.wrp-btn { display: inline-flex; align-items: center; gap: 5px; height: auto; min-height: 0; padding: 3px 10px; margin: 0;
    border: none; border-radius: 50px; font: 600 11px 'Rubik','Open Sans',sans-serif; cursor: pointer; white-space: nowrap; }
/* Pilule pleine #1976d2 : blanc sur #2196f3 ne fait que 3,12:1 (charte, arbitrage du 25/09). */
.wrp-btn-primary { background: #1976d2; color: #fff; }
.wrp-btn-neutral { background: #dde3ea; color: #2d3748; }
.wrp-btn:hover { filter: brightness(1.08); }
.wrp-btn[hidden] { display: none; }
.wrp-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.wrp-statut { flex: 1; min-width: 0; font-size: 11px; color: #566372; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: end; }
.wrp-statut b { color: #2d3748; }
.wrp-opts { margin-top: 6px; font-size: 11px; }
.wrp-opts summary { display: flex; align-items: center; gap: 6px; cursor: pointer; list-style: none; min-width: 0; }
.wrp-opts summary::-webkit-details-marker { display: none; }
.wrp-opts-btn { flex-shrink: 0; padding: 2px 9px; border: 1px solid #90caf9; border-radius: 50px; background: #fff; color: #1565c0; font-weight: 600; white-space: nowrap; }
.wrp-opts summary:hover .wrp-opts-btn, .wrp-opts[open] .wrp-opts-btn { background: #e3f2fd; border-color: #2196f3; }
.wrp-opts-res { min-width: 0; color: #566372; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#wrp-opts-corps { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; padding: 7px 8px; border: 1px solid #dde3ea; border-radius: 8px; background: #f5f7f9;
    max-height: 220px; overflow-y: auto; }
.wrp-opt-l { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.wrp-opt-l > span:first-child { width: 74px; flex-shrink: 0; font-weight: 600; color: #566372; }
.wrp-opt-l label { display: inline-flex; align-items: center; gap: 3px; cursor: pointer; }
.wrp-opt-l input[type=checkbox] { margin: 0; }
.wrp-opt-l select, .wrp-opt-l input[type=datetime-local] { font: 11px 'Rubik','Open Sans',sans-serif; padding: 1px 4px; height: 22px; box-sizing: border-box; }
.wrp-opt-pass label { flex-basis: 100%; margin-inline-start: 84px; }
.wrp-opt-pass label.utile { font-weight: 700; color: #1565c0; }
.wrp-opt-pass > span:first-child { align-self: flex-start; }
.wrp-opt-pass label:first-of-type { margin-top: -18px; }
.wrp-opt-note { margin: 2px 0 0; font-size: 10px; color: #566372; line-height: 1.4; }
.wrp-fiche { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 6px; font-size: 11px; }
.wrp-fiche[hidden] { display: none; }
.wrp-via { font-weight: 700; color: #2d3748; margin-inline-end: 2px; }
.wrp-pz { padding: 1px 8px; border-radius: 50px; font-weight: 600; font-size: 10.5px; white-space: nowrap; }
.wrp-pz.peage { background: #5f6368; color: #fff; }
.wrp-pz.zone { background: #fff3e0; color: #b23c00; border: 1px solid #ffcc80; }
.wrp-pz.eviter { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
.wrp-pz.info { background: #eceff1; color: #455a64; }
.wrp-pz.ok { background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; }
.wrp-chip[hidden] { display: none; }
.wrp-chip.on { background: #e3f2fd; border-color: #1565c0; }
.wrp-alts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.wrp-alts[hidden] { display: none; }
.wrp-alt { min-width: 0; max-width: 100%; min-height: 0; padding: 2px 9px; margin: 0; border: 1px solid #dde3ea; border-radius: 50px; background: #fff;
    color: #2d3748; font: 11px 'Rubik','Open Sans',sans-serif; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wrp-alt:hover { border-color: #2196f3; }
.wrp-alt.on { background: #e3f2fd; border-color: #1565c0; color: #1565c0; font-weight: 600; }
.wrp-note { display: flex; align-items: flex-start; gap: 6px; margin-top: 6px; padding: 6px 8px; border: 1px solid #90caf9; border-radius: 8px;
    background: #e3f2fd; color: #0d47a1; font-size: 11px; line-height: 1.45; }
.wrp-note[hidden] { display: none; }
.wrp-diff { padding: 0 6px; border-radius: 50px; font-size: 10px; font-weight: 700; line-height: 16px; }
.wrp-diff.mod { background: #fb8c00; color: #000; }
.wrp-diff.new { background: #66bb6a; color: #000; }
.wrp-actions { display: flex; justify-content: flex-end; padding: 0 10px 6px; }
.wrp-refs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.wrp-refs li { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 11px; }
.wrp-ref-txt { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#wrp-corps { flex: 1; min-height: 0; overflow-y: auto; background: #fff; }
#wrp-corps:has(.wrp-list) { background: #000; }
#wrp-corps.wrp-encalcul { opacity: .45; pointer-events: none; }
.wrp-erreur { color: #c62828; }
.wrp-opt-heure { margin: 0 0 0 84px; font-size: 10.5px; color: #1565c0; }
.wrp-vide { padding: 14px 12px; background: #fff; color: #566372; font-size: 11px; line-height: 1.6; }
#wrp-resize { position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; z-index: 3; opacity: .5;
    background: linear-gradient(135deg, transparent 46%, #9aa5b1 46%, #9aa5b1 54%, transparent 54%),
                linear-gradient(135deg, transparent 70%, #9aa5b1 70%, #9aa5b1 78%, transparent 78%); }
#wrp-resize:hover { opacity: 1; }

/* Liste « Étapes suivantes » de l'appli (navigation_list_item.xml) : lignes alternées #000 / #202124,
   icône 70 dp avec le n° de sortie, distance blanche grasse, texte bleu Waze #33CCFF. */
.wrp-list { list-style: none; margin: 0; padding: 0; font-family: Roboto,'Rubik',Arial,sans-serif; color: #fff; }
.wrp-list li { position: relative; display: block; padding: 0; background: #000; cursor: pointer; border-left: 3px solid transparent; }
.wrp-ligne { display: flex; align-items: center; gap: 10px; padding: 8px 10px 8px 8px; }
.wrp-list li.actif { padding: 4px 0; }
.wrp-list li.actif .wrp-l0 b { font-size: 24px; }
.wrp-list li.actif .wrp-l1 { font-size: 18px; }
.wrp-list li.actif .wrp-l2 { font-size: 16px; }
.wrp-list li:nth-child(even) { background: #202124; }
.wrp-list li:hover { background: #10222c; }
.wrp-list li.actif { background: #0b2f40; border-left-color: #33ccff; }
.wrp-fl { position: relative; flex-shrink: 0; width: 44px; height: 44px; }
.wrp-num { position: absolute; left: -4px; top: -4px; font-size: 9px; color: #9aa0a6; }
.wrp-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.wrp-l0 { display: flex; align-items: center; gap: 6px; }
.wrp-l0 b { font-size: 19px; font-weight: 700; line-height: 1.15; }
.wrp-l0 .wrp-nb-sorties { margin-inline-start: auto; }
.wrp-l1 { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 15px; font-weight: 700; color: #33ccff; line-height: 1.25; }
.wrp-l2 { font-size: 14px; font-weight: 300; color: #33ccff; }
.wrp-cote { font-weight: 300; }
.wrp-sh { width: auto; vertical-align: middle; }
.wrp-perso { color: #ffb74d; font-size: 11px; }
.wrp-anns { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-top: 3px; font-size: 10px; color: #9aa5b1; }
.wrp-ann { height: 18px; min-height: 0; padding: 0 7px; margin: 0; border: 1px solid #3c4043; border-radius: 50px; background: #202124;
    color: #cfd8dc; font: 600 10px 'Rubik','Open Sans',sans-serif; cursor: pointer; }
.wrp-list li:nth-child(even) .wrp-ann { background: #000; }
.wrp-ann:hover { background: #33ccff !important; border-color: #33ccff; color: #000; }

/* Éléments du bandeau de l'appli (navbar.xml) repris par la ligne dépliée : voies, pastille « puis », sorties. */
.wrp-nb-voies { display: flex; justify-content: center; padding: 6px 8px 0; }
.wrp-nb-sorties { display: flex; gap: 4px; }
.wrp-nb-puis { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 36px; padding: 0 10px;
    background: #202124; font-size: 14px; font-weight: 500; }
.wrp-nb-puis span { display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; }

/* Onglet Scripts : réglages seulement. */
#wrp-pane { padding: 10px 12px; font-family: 'Rubik','Open Sans',sans-serif; font-size: 12px; color: #2d3748; }
#wrp-pane h2 { font-size: 13px; font-weight: 700; color: #2196f3; margin: 0 0 8px; }
#wrp-pane h2 span { font-size: 11px; font-weight: 400; color: #9e9e9e; }
.wrp-hint { font-size: 11px; color: #566372; line-height: 1.6; margin: 0 0 6px; }
.wrp-sec { font-size: 11px; font-weight: 700; color: #2196f3; text-transform: uppercase; letter-spacing: .05em; margin: 14px 0 6px; }
.wrp-opt { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; line-height: 1.4; cursor: pointer; }
.wrp-opt input { margin: 2px 0 0; }
#wrp-pane h2 { display: flex; align-items: center; gap: 6px; }
.wrp-sb-ico { display: inline-flex; }
.wrp-sb-open { margin-top: 8px; }
.wrp-sb-open svg { background: #fff; border-radius: 50%; padding: 1px; }
.wrp-sb-maj { margin: 0 0 8px; padding: 5px 8px; border-radius: 8px; background: #ffebee; color: #c62828; font-size: 11px; font-weight: 600; }
.wrp-sb-maj[hidden] { display: none; }
.wrp-sb-maj a { color: #c62828; }
/* Interrupteur et volets d'aide : les codes de WCT (via WJN). Rail éteint #8a94a0 et non #ccc : 3,08:1 sur blanc au lieu
   de 1,61:1 (WCAG 1.4.11, audit du 25/09) — écart VOULU avec WCT/WJN/WPEU, qui suivront à leur prochaine version. */
.wrp-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wrp-toggle-row > span { font-size: 12px; font-weight: 600; line-height: 1.35; }
.wrp-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; margin: 0; }
.wrp-toggle input { opacity: 0; width: 0; height: 0; }
.wrp-toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #8a94a0; border-radius: 50px; transition: background .2s; }
.wrp-toggle-slider:before { content: ''; position: absolute; width: 14px; height: 14px; inset-inline-start: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: transform .2s; }
.wrp-toggle input:checked + .wrp-toggle-slider { background: #2196f3; }
.wrp-toggle input:checked + .wrp-toggle-slider:before { transform: translateX(16px); }
/* La liste des voix tient dans la largeur du panneau : libellé au-dessus, liste pleine largeur. */
.wrp-sb-champ { display: flex; flex-direction: column; gap: 3px; margin: 10px 0 4px; font-weight: 600; font-size: 12px; }
.wrp-sb-champ select { box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; height: 26px; padding: 1px 4px; font: 12px 'Rubik','Open Sans',sans-serif; }
.wrp-help-section { border: 1px solid #dde3ea; border-radius: 8px; margin-bottom: 4px; overflow: hidden; }
.wrp-help-hdr { display: flex; align-items: center; justify-content: space-between; width: 100%; height: auto; min-height: 0; margin: 0; border: none;
    font-family: inherit; text-align: start; padding: 5px 9px; font-size: 11px; font-weight: 700; cursor: pointer; background: #f5f7f9; color: #2d3748; user-select: none; }
.wrp-help-hdr.on { color: #1565c0; background: #e3f2fd; }
.wrp-help-hdr:hover { background: #eef4fb; }
.wrp-help-body { padding: 7px 9px; font-size: 11px; line-height: 1.5; color: #2d3748; }
.wrp-help-body p { margin: 0 0 5px; }
.wrp-help-body p:last-child { margin: 0; }
#wrp-pane kbd { display: inline-block; background: #f5f7f9; color: #2d3748; border: 1px solid #dde3ea; border-bottom-width: 2px; border-radius: 3px;
    padding: 0 4px; font-family: ui-monospace,Menlo,Consolas,monospace; font-size: 10px; line-height: 1.5; }
.wrp-sb-foot { margin-top: 12px; padding-top: 10px; border-top: 1px solid #dde3ea; font-size: 11px; color: #9e9e9e; line-height: 1.6; }
.wrp-sb-foot a { color: #1565c0; }

/* Ligne TRAJET du panneau d'un segment ou d'un lieu. */
#wrp-bar { display: flex; align-items: center; gap: 4px; padding: 4px 16px 6px; font-family: 'Rubik','Open Sans',sans-serif; font-size: 12px; color: #2d3748; }
.wrp-bar-lbl { font-size: 10px; font-weight: 600; color: #566372; text-transform: uppercase; letter-spacing: .04em; margin-inline-end: 2px; white-space: nowrap; }
.wrp-bar-txt { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 4px; }
.wrp-drapeau svg { display: block; }
span.wrp-drapeau { cursor: default; }
span.wrp-drapeau:hover { background: #fff; border-color: #dde3ea; }
button.wrp-drapeau:hover { background: #eef4fb; border-color: #2196f3; }
.wrp-drapeau.pose { background: #e3f2fd; border: 2px solid #1565c0; }
.wrp-chip.wrp-croix { color: #566372; font-size: 10px; }
.wrp-chip.wrp-croix:hover { background: #e53935; border-color: #e53935; color: #fff; }
#wrp-bar .wrp-croix { margin-inline-start: 2px; }
#wrp-bar :focus-visible, #wrp-ov :focus-visible, #wrp-pane :focus-visible, #wrp-fab-btn:focus-visible { outline: 2px solid #2196f3; outline-offset: 1px; }
/* Sur l'en-tête bleu, un contour bleu était invisible (1,18:1) : blanc (5,75:1). */
#wrp-hdr :focus-visible { outline-color: #fff; }
/* L'interrupteur cache sa case : le contour se porte sur le curseur. */
.wrp-toggle input:focus-visible + .wrp-toggle-slider { outline: 2px solid #1565c0; outline-offset: 2px; }
.wrp-list li:focus-visible { outline: 2px solid #33ccff; outline-offset: -2px; }
`;

    // =====================================================================
    //  Réglages (onglet Scripts) — mémorisés dans le navigateur
    // =====================================================================

    const OPTS_KEY = 'wrp.opts', GEOM_KEY = 'wrp.geom';
    const lireStock = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } };
    const ecrireStock = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
    const opts = Object.assign({ ouvrirAuCalcul: true, voix: '', vehicule: 'PRIVATE', eviter: [], pass: [], bitume: 'interdire', intersections: true }, lireStock(OPTS_KEY, {}));
    // Options du calcul. Le départ n'est pas mémorisé : une heure choisie hier n'a plus de sens.
    const VEHICULES = ['PRIVATE', 'TAXI', 'MOTORCYCLE', 'EV'];
    const EVITER = [{ id: 'peages', opt: 'AVOID_TOLL_ROADS' }, { id: 'autoroutes', opt: 'AVOID_PRIMARIES' }, { id: 'ferries', opt: 'AVOID_FERRIES' }];
    let depart = null;                  // Date (un INSTANT), ou null = maintenant

    // Heure du LIEU (arbitrage de l'auteur, 25/09) : le départ se lit et se saisit dans le fuseau du trajet,
    // pas dans celui du navigateur — un éditeur à Paris qui contrôle la Guadeloupe et choisit 8:00 obtenait
    // le trafic de 2 h du matin sur place. Le fuseau vient de la réponse du calcul (r.timeZone) ; avant le
    // premier calcul, celui du navigateur, et on le dit.
    let fuseauLieu = null;
    const fuseauNav = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
    const fuseau = () => fuseauLieu || fuseauNav();
    // Écart (heure murale du fuseau − UTC) en ms à l'instant ms.
    function decalage(ms, tz) {
        const p = {};
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
            .formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
        return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
    }
    // « AAAA-MM-JJThh:mm » lu à l'heure du fuseau → instant ; deux passes pour les changements d'heure.
    function murVersInstant(val, tz) {
        const m = /^(\d{4})-(\d{2})-(\d{2})[T](\d{2}):(\d{2})/.exec(val || '');
        if (!m) return null;
        const mur = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
        const t1 = mur - decalage(mur, tz);
        return mur - decalage(t1, tz);
    }
    function instantVersMur(ms, tz) {
        const d = new Date(ms + decalage(ms, tz)), z = n => String(n).padStart(2, '0');
        return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()) + 'T' + z(d.getUTCHours()) + ':' + z(d.getUTCMinutes());
    }
    const heureLieu = (ms, court) => new Date(ms).toLocaleString(_lang, court
        ? { timeZone: fuseau(), hour: '2-digit', minute: '2-digit' }
        : { timeZone: fuseau(), weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const texteHeureLieu = () => fuseauLieu ? t('heureLieu', heureLieu(Date.now(), true), fuseauLieu) : t('heureNav', heureLieu(Date.now(), true), fuseauNav());
    // Les pass du pays affiché (restrictionSubscriptions) ; un pass coché ailleurs reste mémorisé
    // mais n'est envoyé que s'il appartient au pays du trajet.
    function passDuPays() {
        let l = [];
        try { l = (sdk.DataModel.Countries.getTopCountry() || {}).restrictionSubscriptions || []; } catch (e) { }
        // La France en déclare 40, dont un identifiant VIDE (relevé le 25/09/2026) : écarté.
        return l.filter(x => x && typeof x.id === 'string' && x.id.trim());
    }
    const passActifs = () => { const ids = passDuPays().map(x => x.id); return opts.pass.filter(id => ids.includes(id)); };

    function htmlOnglet() {
        const aide = t('aide');
        return '<div id="wrp-pane" dir="ltr"><h2><span class="wrp-sb-ico">' + iconeScript(18) + '</span>' + SCRIPT_NAME + ' <span>v' + VERSION + '</span></h2>' +
            '<p class="wrp-sb-maj" id="wrp-sb-maj" hidden><span></span> <a href="#" data-act="maj">' + esc(t('majInstall')) + '</a></p>' +
            '<p class="wrp-hint">' + esc(t('sbHint')) + '</p>' +
            '<button type="button" class="wrp-btn wrp-btn-primary wrp-sb-open" data-act="open">' + iconeScript(14) + ' ' + esc(t('openWin')) + '</button>' +
            '<div class="wrp-sec">' + esc(t('secSettings')) + '</div>' +
            '<div class="wrp-toggle-row"><span>' + esc(t('optOpen')) + '</span><label class="wrp-toggle">' +
            '<input type="checkbox" data-opt="ouvrirAuCalcul"' + (opts.ouvrirAuCalcul ? ' checked' : '') + '><span class="wrp-toggle-slider"></span></label></div>' +
            '<label class="wrp-sb-champ"><span>' + esc(t('optVoice')) + '</span><select data-opt="voix">' +
            '<option value="">' + esc(t('voiceAuto')) + '</option>' +
            VOIX.map(v => '<option value="' + v + '"' + (opts.voix === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label>' +
            '<p class="wrp-hint">' + esc(t('voiceHint')) + '</p>' +
            '<div class="wrp-sec">&#x1F4CC; ' + esc(t('secRefs')) + '</div><p class="wrp-hint">' + esc(t('refsHint')) + '</p><div id="wrp-refs"></div>' +
            '<div class="wrp-sec">&#x2753; ' + esc(t('sbHelp')) + '</div>' +
            aide.map((x, i) => '<div class="wrp-help-section"><button type="button" class="wrp-help-hdr' + (i ? '' : ' on') + '" data-aide="' + i + '" aria-expanded="' + !i + '">' +
                esc(x.t) + ' <span>' + (i ? '&#x25B6;' : '&#x25BC;') + '</span></button><div class="wrp-help-body" data-corps="' + i + '"' + (i ? ' hidden' : '') + '>' + x.b + '</div></div>').join('') +
            '<p class="wrp-sb-foot">&#x1F512; ' + esc(t('sbSafe')) + '<br>&#x1F517; <a href="' + URL_GF + '" target="_blank" rel="noopener">GreasyFork</a>' +
            ' &nbsp;&#xB7;&nbsp; <a href="' + URL_GH + '" target="_blank" rel="noopener">GitHub</a></p></div>';
    }

    function brancherOnglet() {
        paneEl.addEventListener('click', ev => {
            const act = ev.target.closest('[data-act]');
            if (act && act.dataset.act === 'open') ouvrirFenetre(true);
            else if (act && act.dataset.act === 'maj') { ev.preventDefault(); ouvrirMaj(); }
            const r = ev.target.closest('[data-ref]');
            if (r) { rouvrirRef(Number(r.dataset.ref)); return; }
            const rx = ev.target.closest('[data-refx]');
            if (rx) { supprimerRef(Number(rx.dataset.refx)); return; }
            const h = ev.target.closest('[data-aide]');
            if (!h) return;
            const corps = paneEl.querySelector('[data-corps="' + h.dataset.aide + '"]');
            const ouvrir = corps.hidden;
            corps.hidden = !ouvrir;
            h.classList.toggle('on', ouvrir);
            h.setAttribute('aria-expanded', String(ouvrir));
            h.querySelector('span').innerHTML = ouvrir ? '&#x25BC;' : '&#x25B6;';
        });
        paneEl.addEventListener('change', ev => {
            const c = ev.target.closest('[data-opt]');
            if (!c) return;
            opts[c.dataset.opt] = c.type === 'checkbox' ? c.checked : c.value;
            ecrireStock(OPTS_KEY, opts);
            // Nouvelle voix : les puces 🔊 et leurs infobulles changent de langue.
            if (c.dataset.opt === 'voix') { arreterLecture(); rendreTrajet(); }
        });
        majRendre();
        majRefsOnglet();
    }

    // =====================================================================
    //  Nouvelle version disponible — même principe que WCT
    // =====================================================================
    //  La pastille rouge ne s'allume que sur une version PUBLIÉE strictement supérieure à celle qui
    //  tourne ; hors ligne, réponse illisible ou page absente (le dépôt n'est pas encore publié) : elle
    //  reste éteinte. Un clic ouvre le fichier : le gestionnaire de scripts propose la mise à jour.

    // Le gestionnaire de scripts connaît l'adresse de mise à jour (le .meta.js de GreasyFork, quelques centaines
    // d'octets) et celle du script : l'en-tête les déclare depuis 0.14.03. Sans elles (copie collée à la main), on
    // se rabat sur le fichier du dépôt GitHub.
    const URL_GF = 'https://greasyfork.org/scripts/597359-wme-route-preview';
    const URL_GH = 'https://github.com/DrSlump34/WME-Route-Preview';
    const URL_DEPOT = 'https://raw.githubusercontent.com/DrSlump34/WME-Route-Preview/master/WME-Route-Preview.user.js';
    const gmScript = () => (typeof GM_info !== 'undefined' && GM_info.script) || {};
    const URL_MAJ = gmScript().updateURL || URL_DEPOT;
    const URL_INSTALLER = gmScript().downloadURL || URL_DEPOT;
    const ICONE_MAJ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>';
    const VER_RE = /^\d+(\.\d+)*$/;
    let majEnLigne = null;
    // Segment par segment, en nombres : en chaînes, « 0.9.00 » passerait pour plus récent que « 0.13.00 ».
    const majCmp = (a, b) => {
        const pa = String(a).split('.'), pb = String(b).split('.');
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const na = Number(pa[i]) || 0, nb2 = Number(pb[i]) || 0;
            if (na !== nb2) return na < nb2 ? -1 : 1;
        }
        return 0;
    };
    function majRendre() {
        const b = ovEl && ovEl.querySelector('[data-act="maj"]');
        if (b) { b.hidden = !majEnLigne; if (majEnLigne) b.title = t('majBtn', majEnLigne); }
        const e = paneEl && paneEl.querySelector('#wrp-sb-maj');
        if (e) { e.hidden = !majEnLigne; if (majEnLigne) e.querySelector('span').textContent = t('majBtn', majEnLigne); }
    }
    const ouvrirMaj = () => { window.open(URL_INSTALLER, '_blank', 'noopener'); };
    // Au plus une vérification par 24 h : chaque chargement de WME téléchargeait sinon tout le fichier
    // (≈ 150 Ko) tant qu'il n'y a pas de .meta.js (audit, lot H). La version vue est gardée entre-temps.
    const MAJ_KEY = 'wrp.maj', MAJ_DELAI = 864e5;
    function verifierMaj() {
        if (!VER_RE.test(VERSION) || typeof GM_xmlhttpRequest !== 'function') return;
        const memo = lireStock(MAJ_KEY, null);
        if (memo && Date.now() - memo.t < MAJ_DELAI) {
            if (memo.v && VER_RE.test(memo.v) && majCmp(VERSION, memo.v) < 0) { majEnLigne = memo.v; majRendre(); }
            return;
        }
        GM_xmlhttpRequest({
            method: 'GET', url: URL_MAJ, timeout: 10000, nocache: true,
            onload: r => {
                // onload vient AUSSI sur un 404 : la page d'erreur ne doit pas être lue comme un script.
                if (r.status < 200 || r.status >= 300) { ecrireStock(MAJ_KEY, { t: Date.now(), v: null }); return; }
                const m = (r.responseText || '').match(/^\/\/\s*@version\s+(\S+)/m);
                ecrireStock(MAJ_KEY, { t: Date.now(), v: m && VER_RE.test(m[1]) ? m[1] : null });
                if (!m || !VER_RE.test(m[1]) || majCmp(VERSION, m[1]) >= 0) return;
                majEnLigne = m[1];
                majRendre();
                log('nouvelle version publiée : ' + m[1] + ' (installée : ' + VERSION + ')');
            },
            onerror: () => { }, ontimeout: () => { },
        });
    }

    // =====================================================================
    //  État partagé : statut, points, calcul
    // =====================================================================

    let dernierStatut = '', statutTimer = null;
    function statut(m) {
        clearTimeout(statutTimer);
        dernierStatut = m || '';
        majResume();
        majBarre();
    }
    // Un message passager (sélection invalide, pas de voix…) s'efface seul : il remplaçait durablement le
    // résumé km · min et le bouton « Détail » (audit C1).
    function statutPassager(m) {
        statut(m);
        statutTimer = setTimeout(() => { if (dernierStatut === m) statut(''); }, 4000);
    }

    // Poser A ou B, d'où qu'il vienne : le trajet se calcule dès que les deux sont là.
    // garderVirage : seul le test d'un virage pose ses points sans oublier le virage testé.
    function poserPoint(k, p, garderVirage) {
        pts[k] = p;
        if (!garderVirage) virageTeste = null;
        masqueParFermeture = false;
        appliquerVisibilite();
        rafraichirPoints();
        dessiner();
        if (pts.A && pts.B) calculer();
        else { generation++; finCalcul(); derniereErreur = null; trajet = null; trajets = []; rendreTrajet(); dessiner(); statut(''); }
    }

    function effacer() {
        generation++;
        finCalcul();
        derniereErreur = null;
        arreterLecture();
        pts = { A: null, B: null };
        trajet = null;
        trajets = [];
        virageTeste = null;
        noteEnreg = '';
        clearTimeout(flashTimer);
        try { sdk.Map.removeAllFeaturesFromLayer({ layerName: L_FLASH }); } catch (e) { }
        rafraichirPoints();
        rendreTrajet();
        dessiner();
        statut('');
    }

    function prendreSelection(k) {
        const p = pointDepuisSelection();
        if (!p) { statutPassager(t('badSel')); return; }
        poserPoint(k, p);
    }

    function prendreCurseur(k) {
        const p = pointSousCurseur();
        if (!p) { statutPassager(t('noPointer')); return; }
        poserPoint(k, p);
    }

    // Deux calculs peuvent se croiser (A puis B posés vite) : seule la réponse du dernier s'affiche.
    // Pendant un recalcul, l'ancienne liste reste affichée, grisée (elle disparaissait, et la position de
    // défilement avec) ; après un échec, la fenêtre dit quoi faire (audit C2, C3).
    let generation = 0, enCalcul = false, derniereErreur = null;
    function finCalcul() {
        enCalcul = false;
        const c = ovEl && ovEl.querySelector('#wrp-corps');
        if (c) c.classList.remove('wrp-encalcul');
    }
    function messageErreur(e) {
        const m = String(e && e.message || e || '');
        if (m === 'no route') return t('errNoRoute');
        if (m === 'network') return t('errNet');
        if (m === 'timeout') return t('errTimeout');
        const h = /^HTTP\s(\d+)/.exec(m);
        if (h) return t('errHttp', h[1]);
        return t('errServeur', m);
    }
    async function calculer() {
        if (!pts.A || !pts.B) { statutPassager(t('needAB')); return; }
        if (depart && depart.getTime() <= Date.now() + 60000) {
            depart = null;
            majOptions();
            statutPassager(t('departPasse'));
        }
        const moi = ++generation;
        arreterLecture();
        enCalcul = true;
        derniereErreur = null;
        const corps = ovEl && ovEl.querySelector('#wrp-corps');
        if (corps) corps.classList.add('wrp-encalcul');
        if (!trajet) rendreTrajet();
        statut(t('busy'));
        let tous = [], err = null;
        try { tous = analyserTous(await demanderTrajet(pts.A, pts.B)); } catch (e) { err = e; }
        if (moi !== generation) return;
        finCalcul();
        trajets = tous;
        choixAlt = choixSelonReference(tous);
        trajet = tous[choixAlt] || null;
        if (trajet && masqueParFermeture) { masqueParFermeture = false; appliquerVisibilite(); }
        if (trajet && !calquesVisibles) basculerCalques(true);
        derniereErreur = err ? messageErreur(err) : null;
        if (err) log('calcul : ' + (err.message || err));
        majOptions();
        rendreTrajet();
        dessiner();
        statut(derniereErreur || '');
        if (trajet && opts.ouvrirAuCalcul) ouvrirFenetre();
        montrerVirageTeste();
        if (trajet) trajet.completion = completerCarrefours(trajet, moi);
    }

    // =====================================================================
    //  La barre du panneau d'un segment ou d'un lieu : drapeaux, et le résultat
    // =====================================================================

    const BAR_ID = 'wrp-bar';

    function barreHTML() {
        const v = virageSelection();
        if (v) return barreVirageHTML(v);
        let ref = null;
        try { const sel = sdk.Editing.getSelection(); if (sel && sel.ids.length === 1) ref = sel.objectType + ':' + sel.ids[0]; } catch (e) { }
        const chip = k => '<button type="button" class="wrp-chip wrp-drapeau' + (pts[k] && pts[k].ref === ref ? ' pose' : '') +
            '" data-bar="' + k + '" title="' + esc(t(k === 'A' ? 'setA' : 'setB')) + '">' + drapeauSVG(k, 15) + '</button>';
        // « Détail » reste là tant qu'un trajet existe, même quand un message occupe la ligne.
        const res = trajet ? '<span class="wrp-bar-txt">' + (dernierStatut ? esc(dernierStatut)
                : '<b>' + esc(distTexte(trajet.metres)) + '</b> · ' + esc(dureeTexte(trajet.secondes))) + '</span>' +
                '<button type="button" class="wrp-btn wrp-btn-neutral" data-bar="detail">' + esc(t('details')) + '</button>'
            : dernierStatut ? '<span class="wrp-bar-txt">' + esc(dernierStatut) + '</span>' : '';
        const croix = (pts.A || pts.B) ? '<button type="button" class="wrp-chip wrp-croix" data-bar="clear" title="' + esc(t('clear')) + '">&#x2715;</button>' : '';
        return '<span class="wrp-bar-lbl" title="' + SCRIPT_NAME + '">' + esc(t('secRoute')) + '</span>' + chip('A') + chip('B') + res + croix;
    }

    // Réécrire seulement si le contenu change : chaque écriture dans le panneau réveille les
    // observateurs (le nôtre et ceux des autres scripts), et une écriture à l'identique bouclerait.
    function majBarre() {
        const bar = document.getElementById(BAR_ID);
        if (!bar) return;
        const html = barreHTML();
        if (bar.dataset.html !== html) { bar.innerHTML = html; bar.dataset.html = html; }
    }

    // WME reconstruit le panneau à chaque sélection : la barre est reposée à chaque fois, et
    // retirée quand la sélection n'est plus un seul segment ou un seul lieu.
    // Elle se range SOUS les barres d'autres scripts posées après l'en-tête (WME Jump to Node exige
    // d'être juste sous l'en-tête et s'y remet dès qu'on l'en déloge : deux barres qui se disputent
    // cette place se déplacent sans fin, et le panneau clignote). Déjà dans le bloc : on n'y touche pas.
    function placerBarre() {
        const entete = document.querySelector('.segment-feature-editor wz-section-header, .venue-feature-editor wz-section-header');
        const existante = document.getElementById(BAR_ID);
        let un = false;
        try { const sel = sdk.Editing.getSelection(); un = !!sel && ((sel.ids.length === 1 && (sel.objectType === 'segment' || sel.objectType === 'venue')) || !!virageSelection()); } catch (e) { }
        if (!entete || !un) { if (existante) existante.remove(); return; }
        if (existante && existante.parentElement === entete.parentElement) { majBarre(); return; }
        if (existante) existante.remove();
        const bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.addEventListener('click', ev => {
            const b = ev.target.closest('[data-bar]');
            if (!b) return;
            if (b.dataset.bar === 'detail') ouvrirFenetre(true);
            else if (b.dataset.bar === 'clear') effacer();
            else if (b.dataset.bar === 'virage') testerVirage();
            else if (b.dataset.bar === 'inverser') { virageInverse = !virageInverse; majBarre(); }
            else prendreSelection(b.dataset.bar);
        });
        let ancre = entete;
        while (ancre.nextElementSibling && /^wjn-/.test(ancre.nextElementSibling.id)) ancre = ancre.nextElementSibling;
        ancre.after(bar);
        majBarre();
    }

    // Un setTimeout et non requestAnimationFrame, suspendu dans un onglet en arrière-plan.
    let placementPrevu = false;
    function planifierPlacement() {
        if (placementPrevu) return;
        placementPrevu = true;
        setTimeout(() => { placementPrevu = false; placerBarre(); }, 30);
    }

    // =====================================================================
    //  Le bouton de la colonne de droite et la fenêtre
    // =====================================================================

    let ovEl = null;
    // Une seule icône pour le script : bouton de la carte, onglet Scripts, titre de l'onglet et en-tête
    // de la fenêtre (demande de l'auteur).
    function iconeScript(h) { return FAB_ICONE.replace(/width="22" height="22"/, 'width="' + h + '" height="' + h + '"'); }
    const FAB_ICONE = '<svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">' +
        // Le dessin de l'illustration (icon.png) réduit à deux formes : la flèche de virage et le haut-parleur.
        '<path d="M15 55 V34 Q15 25 24 25 H31" fill="none" stroke="#1565c0" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M29 13 L43 25 L29 37 Z" fill="#1565c0" stroke="#1565c0" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M37 47 H42 L50 40 V60 L42 53 H37 Z" fill="#fb8c00" stroke="#fb8c00" stroke-width="1.5" stroke-linejoin="round"/><path d="M54 44 Q57.5 50 54 56" fill="none" stroke="#fb8c00" stroke-width="3" stroke-linecap="round"/></svg>';

    // Le bouton vit dans la colonne native de WME, où WCT et WNA ont le leur. ⚠️ Il ne réclame
    // AUCUNE place : WCT se remet en dernière position dès qu'un bouton passe après lui ; exiger
    // la même place ferait se déplacer les deux sans fin. On vérifie seulement qu'il est toujours
    // dans la colonne (WME la reconstruit parfois), et on le repose sinon.
    function poserFab() {
        const cont = document.querySelector('.overlay-buttons-container.top') || document.querySelector('.overlay-buttons-container');
        if (!cont) return false;
        if (cont.querySelector('#wrp-fab-wrap')) return true;
        const vieux = document.getElementById('wrp-fab-wrap');
        if (vieux) vieux.remove();
        const wrap = document.createElement('div');
        wrap.id = 'wrp-fab-wrap';
        wrap.innerHTML = '<button type="button" id="wrp-fab-btn" title="' + SCRIPT_NAME + '">' + FAB_ICONE + '</button>';
        wrap.querySelector('button').addEventListener('click', ev => {
            ev.stopPropagation();
            if (ovEl && ovEl.classList.contains('open')) fermerFenetre(); else ouvrirFenetre(true);
        });
        const wct = cont.querySelector('#wct-fab-wrap');
        if (wct) cont.insertBefore(wrap, wct); else cont.appendChild(wrap);
        majFab();
        return true;
    }
    const majFab = () => { const b = document.getElementById('wrp-fab-btn'); if (b) b.classList.toggle('actif', !!(ovEl && ovEl.classList.contains('open'))); };

    function htmlFenetre() {
        const pt = k => '<div class="wrp-pt"><span class="wrp-chip wrp-drapeau" title="' + esc(t(k === 'A' ? 'lblStart' : 'lblFinish')) + '">' + drapeauSVG(k, 15) + '</span>' +
            '<span class="wrp-pt-champ"><input type="search" class="wrp-pt-lbl" data-lbl="' + k + '" autocomplete="off" spellcheck="false" placeholder="' + esc(t('searchPh', k)) + '">' +
            '<ul class="wrp-sugg" data-sugg="' + k + '" hidden></ul></span>' +
            '<button type="button" class="wrp-btn wrp-btn-neutral" data-take="' + k + '" title="' + esc(t(k === 'A' ? 'setA' : 'setB')) + '">' + esc(t('take')) + '</button></div>';
        return '<div id="wrp-hdr" title="' + esc(t('dragTip')) + '"><span class="wrp-hdr-title"><span class="wrp-hdr-ico">' + iconeScript(16) + '</span>' +
            SCRIPT_NAME + ' <span class="wrp-hdr-v">v' + VERSION + '</span></span><span class="wrp-hdr-btns">' +
            '<button type="button" class="wrp-hdr-btn wrp-hdr-maj" data-act="maj" hidden>' + ICONE_MAJ + '</button>' +
            '<button type="button" class="wrp-hdr-btn" data-act="close" title="' + esc(t('close')) + '">&#x2715;</button></span></div>' +
            '<div id="wrp-haut">' + pt('A') + pt('B') +
            '<div class="wrp-row"><button type="button" class="wrp-chip" data-act="swap" title="' + esc(t('swap')) + '">&#x21C5;</button>' +
            '<button type="button" class="wrp-chip wrp-croix" data-act="clear" title="' + esc(t('clear')) + '">&#x2715;</button>' +
            '<button type="button" class="wrp-chip" data-act="compute" title="' + esc(t('recompute')) + '">&#x27F3;</button>' +
            '<button type="button" class="wrp-chip" data-act="pin" hidden>&#x1F4CC;</button>' +
            '<button type="button" class="wrp-chip" data-act="link" title="' + esc(t('link')) + '" hidden>&#x1F517;</button>' +
            '<button type="button" class="wrp-btn wrp-btn-primary" data-act="playall" hidden>' + esc(t('playAll')) + '</button>' +
            '<span class="wrp-statut" id="wrp-statut"></span></div><div class="wrp-alts" id="wrp-alts" hidden></div>' +
            '<div class="wrp-fiche" id="wrp-fiche" hidden></div><div class="wrp-note" id="wrp-note" hidden></div>' +
            '<details class="wrp-opts" id="wrp-opts"><summary id="wrp-opts-resume"></summary><div id="wrp-opts-corps"></div></details></div>' +
            '<div id="wrp-corps"></div><div id="wrp-resize"></div>';
    }

    function construireFenetre() {
        ovEl = document.createElement('div');
        ovEl.id = 'wrp-ov';
        ovEl.dir = 'ltr';
        ovEl.tabIndex = -1;
        ovEl.setAttribute('role', 'dialog');
        ovEl.setAttribute('aria-label', SCRIPT_NAME);
        ovEl.innerHTML = htmlFenetre();
        document.body.appendChild(ovEl);
        ovEl.addEventListener('click', surClicFenetre);
        // Une ligne de la liste s'ouvre aussi au clavier : Entrée ou Espace sur la ligne elle-même (audit G3).
        ovEl.addEventListener('keydown', ev => {
            if ((ev.key !== 'Enter' && ev.key !== ' ') || !ev.target.matches || !ev.target.matches('.wrp-list li')) return;
            ev.preventDefault();
            ev.stopPropagation();
            const i = Number(ev.target.dataset.i);
            montrer(i);
            aller(trajet.manoeuvres[i]);
            const li = ovEl.querySelectorAll('.wrp-list li')[i];
            if (li) li.focus();
        });
        brancherRecherche();
        const det = ovEl.querySelector('#wrp-opts');
        det.addEventListener('toggle', () => majOptions(true));
        det.addEventListener('change', surOption);
        det.addEventListener('click', ev => { if (ev.target.closest('[data-o="maintenant"]')) surOption(ev); });
        // Les touches tapées dans les options ne partent pas vers les raccourcis de WME.
        det.addEventListener('keydown', gardeTouche);
        majOptions();
        deplacable(ovEl, ovEl.querySelector('#wrp-hdr'));
        redimensionnable(ovEl, ovEl.querySelector('#wrp-resize'));
        window.addEventListener('resize', () => { if (ovEl.classList.contains('open')) placerFenetre(lireStock(GEOM_KEY, null)); });
        rafraichirPoints();
        rendreTrajet();
    }

    // Au clavier, l'ouverture porte le focus dans la fenêtre, et la fermeture le rend là d'où il venait
    // (audit G2). Une ouverture automatique après un calcul ne vole PAS le focus (on édite peut-être ailleurs).
    let retourFocus = null;
    function ouvrirFenetre(prendreFocus) {
        if (!ovEl) return;
        const deja = ovEl.classList.contains('open');
        ovEl.classList.add('open');
        if (!deja) placerFenetre(lireStock(GEOM_KEY, null));
        majFab();
        masqueParFermeture = false;
        appliquerVisibilite();
        if (prendreFocus && !deja) {
            retourFocus = document.activeElement;
            const vide = ['A', 'B'].map(k => ovEl.querySelector('[data-lbl="' + k + '"]')).find(e => e && !e.value);
            (vide || ovEl).focus();
        }
    }
    function fermerFenetre() {
        if (!ovEl) return;
        arreterLecture();
        const dedans = ovEl.contains(document.activeElement);
        ovEl.classList.remove('open');
        majFab();
        masqueParFermeture = true;
        appliquerVisibilite();
        if (dedans) {
            const cible = retourFocus && document.contains(retourFocus) ? retourFocus : document.getElementById('wrp-fab-btn');
            if (cible) cible.focus();
        }
        retourFocus = null;
    }

    // Les bornes de la carte, MESURÉES à chaque geste (repris de WPEU) : jamais sur le volet gauche
    // de WME, jamais sur le pied de page, et jamais sur la colonne de boutons de droite — ni en
    // déplaçant la fenêtre, ni en l'agrandissant : c'est là que vit le bouton qui la rouvre.
    function bornesCarte() {
        const carte = document.getElementById('WazeMap') || document.querySelector('.olMapViewport');
        const pied = document.querySelector('.wz-map-ol-footer');
        const btns = document.querySelector('.overlay-buttons-container.top') || document.querySelector('.overlay-buttons-container');
        const r = carte ? carte.getBoundingClientRect() : { left: 0, top: 40, right: window.innerWidth, bottom: window.innerHeight };
        const rb = btns ? btns.getBoundingClientRect() : null;
        return {
            gauche: Math.round(r.left) + 6,
            haut: Math.round(r.top) + 6,
            droite: Math.round(rb && rb.width ? rb.left - 8 : r.right - 8),
            bas: Math.round(pied ? pied.getBoundingClientRect().top - 6 : r.bottom - 6),
        };
    }

    // Ramène une géométrie dans les bornes. Le plancher (300 × 220) protège d'une fenêtre réduite à
    // rien, mais ne passe jamais devant la carte : sur une carte étroite, c'est la carte qui décide.
    function bornerFenetre(g, z) {
        const dispoL = z.droite - z.gauche, dispoH = z.bas - z.haut;
        const w = Math.min(Math.max(Math.min(g.w, dispoL), 300), dispoL);
        const h = Math.min(Math.max(Math.min(g.h, dispoH), 220), dispoH);
        return { x: Math.max(z.gauche, Math.min(g.x, z.droite - w)), y: Math.max(z.haut, Math.min(g.y, z.bas - h)), w, h };
    }
    const poser = g => Object.assign(ovEl.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });

    // Sans géométrie mémorisée : collée à gauche des boutons, sous la barre d'outils, toute la hauteur.
    function placerFenetre(memo) {
        const z = bornesCarte();
        poser(bornerFenetre(memo || { x: z.droite - 380, y: z.haut, w: 380, h: z.bas - z.haut }, z));
    }
    const memoriserGeometrie = () => { const r = ovEl.getBoundingClientRect(); ecrireStock(GEOM_KEY, { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }); };

    // Position et taille ne s'enregistrent qu'au relâchement : un déplacement produit des centaines
    // de mousemove. Double-clic sur l'en-tête : retour à la place par défaut.
    function deplacable(el, poignee) {
        poignee.addEventListener('mousedown', e => {
            if (e.button !== 0 || e.target.closest('button')) return;
            e.preventDefault();
            const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
            const mv = ev => poser(bornerFenetre({ x: ev.clientX - ox, y: ev.clientY - oy, w: el.offsetWidth, h: el.offsetHeight }, bornesCarte()));
            const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); memoriserGeometrie(); };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        });
        poignee.addEventListener('dblclick', e => {
            if (e.target.closest('button')) return;
            try { localStorage.removeItem(GEOM_KEY); } catch (er) { }
            placerFenetre(null);
        });
    }
    // Le coin haut-gauche reste fixe : seule la largeur et la hauteur suivent, bornées elles aussi.
    function redimensionnable(el, poignee) {
        poignee.addEventListener('mousedown', e => {
            e.preventDefault(); e.stopPropagation();
            const r = el.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
            const mv = ev => {
                const z = bornesCarte();
                const w = Math.max(300, Math.min(r.width + ev.clientX - x0, z.droite - r.left));
                const h = Math.max(220, Math.min(r.height + ev.clientY - y0, z.bas - r.top));
                poser({ x: r.left, y: r.top, w, h });
            };
            const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); memoriserGeometrie(); };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        });
    }

    function surClicFenetre(ev) {
        const take = ev.target.closest('[data-take]');
        if (take) { prendreSelection(take.dataset.take); return; }
        const act = ev.target.closest('[data-act]');
        if (act) {
            const a = act.dataset.act;
            if (a === 'close') fermerFenetre();
            else if (a === 'maj') ouvrirMaj();
            else if (a === 'swap') { const x = pts.A; pts.A = pts.B; poserPoint('B', x); }
            else if (a === 'compute') calculer();
            else if (a === 'clear') effacer();
            else if (a === 'playall') toutEcouter();
            else if (a === 'pin') epingler();
            else if (a === 'link') copierLien();
            else if (a === 'selseg') selectionnerApproche(Number(act.dataset.i));
            else if (a === 'note-x') { noteEnreg = ''; majNote(); }
            return;
        }
        const alt = ev.target.closest('[data-alt]');
        if (alt) { choisirItineraire(Number(alt.dataset.alt)); return; }
        const ann = ev.target.closest('[data-ann]');
        if (ann) {
            ev.stopPropagation();
            const x = trajet.annonces[Number(ann.dataset.ann)];
            // Une puce écoutée pendant « Tout écouter » arrête l'enchaînement : sinon la boucle reprenait
            // 400 ms plus tard et coupait la puce (à livrer AVEC la résolution à la pause, audit B1 + B3).
            arreterLecture();
            montrer(x.k, x.d || FINALE);
            dire(x);
            return;
        }
        const li = ev.target.closest('.wrp-list li');
        if (li) { const i = Number(li.dataset.i); montrer(i); aller(trajet.manoeuvres[i]); }
    }

    function rafraichirPoints() {
        if (!ovEl) return;
        for (const k of ['A', 'B']) {
            const e = ovEl.querySelector('[data-lbl="' + k + '"]');
            if (document.activeElement !== e) e.value = pts[k] ? pts[k].label : '';
            e.title = pts[k] ? pts[k].label : '';
        }
    }

    // =====================================================================
    //  Recherche d'une adresse ou d'un lieu : le service de la barre « Rechercher » de WME
    // =====================================================================
    //  W.app.descartesClient.searchLocations({query, mapCenter}) — client INTERNE de WME, le même
    //  que pour la voix ; relevé le 25/09/2026 (WME v2.370) sur la requête gRPC de sa barre de
    //  recherche. Rend {places: [{type, displayName, address, geometry.coordinate[0] {x, y}}]} :
    //  type 1 = un lieu (nom dans displayName), type 2 = une adresse ou une rue. Classé par
    //  proximité du centre de la carte, comme dans WME.
    const RECHERCHE_MS = 300, SUGG_MAX = 8;
    let rechercheTimer = null, rechercheGen = 0;
    const sugg = { A: [], B: [] };

    const libelleLieu = p => {
        const a = p.address || {};
        const rue = [a.houseNumber, a.street].filter(x => x).join(' ');
        const nom = p.displayName || rue || a.city || '?';
        const lieu = [p.displayName && rue !== nom ? rue : '', a.city !== nom ? a.city : ''].filter(x => x).join(', ');
        return lieu ? nom + ' · ' + lieu : nom;
    };

    async function chercher(k, q) {
        const moi = ++rechercheGen;
        const ul = ovEl.querySelector('[data-sugg="' + k + '"]');
        const dc = pw.W && pw.W.app && pw.W.app.descartesClient;
        if (!dc || typeof dc.searchLocations !== 'function') { ul.innerHTML = '<li class="wrp-sugg-vide">' + esc(t('noSearch')) + '</li>'; ul.hidden = false; return; }
        let c = null;
        try { c = sdk.Map.getMapCenter(); } catch (e) { }
        // WME rend null quand SA requête échoue (il avale l'erreur) : échec et « aucun résultat » ne se
        // confondent plus (audit C4).
        let r = null, echec = false;
        try { r = await dc.searchLocations({ query: q, mapCenter: c ? { lon: c.lon, lat: c.lat } : undefined }); } catch (e) { echec = true; log('recherche : ' + e.message); }
        if (r == null) echec = true;
        if (moi !== rechercheGen) return;
        const places = ((r && r.places) || []).filter(p => p.geometry && p.geometry.coordinate && p.geometry.coordinate[0]).slice(0, SUGG_MAX);
        sugg[k] = places.map(p => ({ lon: p.geometry.coordinate[0].x, lat: p.geometry.coordinate[0].y, label: libelleLieu(p), lieu: p.type === 1 }));
        ul.innerHTML = sugg[k].length
            ? sugg[k].map((x, i) => '<li data-choix="' + i + '"' + (i ? '' : ' class="sel"') + '>' + (x.lieu ? '&#x1F4CD; ' : '') + esc(x.label) + '</li>').join('')
            : '<li class="wrp-sugg-vide">' + esc(t(echec ? 'searchFail' : 'noResult')) + '</li>';
        ul.hidden = false;
    }

    function fermerSugg(k) {
        rechercheGen++;
        clearTimeout(rechercheTimer);
        const ul = ovEl.querySelector('[data-sugg="' + k + '"]');
        ul.hidden = true;
        ul.innerHTML = '';
        sugg[k] = [];
    }

    function choisirSugg(k, i) {
        const x = sugg[k][i];
        if (!x) return;
        fermerSugg(k);
        ovEl.querySelector('[data-lbl="' + k + '"]').blur();
        poserPoint(k, { lon: x.lon, lat: x.lat, label: x.label });
    }

    // Une touche SIMPLE tapée dans un champ ne doit pas atteindre WME (ses raccourcis d'une lettre agiraient
    // sur la carte). Mais Ctrl, Méta et Alt passent : Ctrl+S ne sauvegardait plus les modifications WME
    // juste après une saisie, sans aucun message (audit E1).
    function gardeTouche(ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        if (ev.target.closest && ev.target.closest('input, select, textarea')) ev.stopPropagation();
    }

    function brancherRecherche() {
        ovEl.addEventListener('input', ev => {
            const e = ev.target.closest('[data-lbl]');
            if (!e) return;
            const k = e.dataset.lbl, q = e.value.trim();
            clearTimeout(rechercheTimer);
            if (q.length < 2) { fermerSugg(k); return; }
            rechercheTimer = setTimeout(() => chercher(k, q), RECHERCHE_MS);
        });
        ovEl.addEventListener('keydown', ev => {
            const e = ev.target.closest('[data-lbl]');
            if (!e) return;
            const k = e.dataset.lbl, ul = ovEl.querySelector('[data-sugg="' + k + '"]');
            const lis = [...ul.querySelectorAll('[data-choix]')];
            const i = lis.findIndex(li => li.classList.contains('sel'));
            gardeTouche(ev);
            if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                if (!lis.length) return;
                const j = (i + (ev.key === 'ArrowDown' ? 1 : lis.length - 1)) % lis.length;
                lis.forEach((li, n) => li.classList.toggle('sel', n === j));
            } else if (ev.key === 'Enter') {
                ev.preventDefault();
                if (lis.length) choisirSugg(k, Math.max(0, i));
            } else if (ev.key === 'Escape') {
                fermerSugg(k);
                e.blur();
                rafraichirPoints();
            }
        });
        // Clic dans la liste : mousedown, pour passer avant la perte du focus du champ.
        ovEl.addEventListener('mousedown', ev => {
            const li = ev.target.closest('[data-choix]');
            if (!li) return;
            ev.preventDefault();
            choisirSugg(li.closest('[data-sugg]').dataset.sugg, Number(li.dataset.choix));
        });
        ovEl.addEventListener('focusout', ev => {
            const e = ev.target.closest && ev.target.closest('[data-lbl]');
            if (!e) return;
            setTimeout(() => { if (document.activeElement !== e) { fermerSugg(e.dataset.lbl); rafraichirPoints(); } }, 150);
        });
    }

    function resumeOptions() {
        const bouts = [depart ? heureLieu(depart.getTime()) + (fuseauLieu ? '' : ' (' + fuseauNav() + ')') : t('now'),
            t('veh_' + opts.vehicule)];
        const ev = EVITER.filter(e => opts.eviter.includes(e.id)).map(e => t('av_' + e.id));
        if (ev.length) bouts.push(t('avoidShort', ev.join(', ')));
        const np = passActifs().length;
        if (np) bouts.push(t('nPass', np));
        if (opts.bitume !== 'interdire') bouts.push(t('tr_' + opts.bitume + '_c'));
        return bouts.join(' · ');
    }

    function htmlOptions() {
        const tz = fuseau(), maintenant = instantVersMur(Date.now(), tz), max = instantVersMur(Date.now() + 14 * 864e5, tz);
        // En tête, les pass que le calcul dit concernés par ce trajet (allRoutePermits), puis les autres.
        const utiles = trajet && trajet.fiche ? trajet.fiche.passTrajet : [];
        const pays = passDuPays().slice().sort((a, b) => (utiles.includes(b.id) - utiles.includes(a.id)) || String(a.name).localeCompare(String(b.name), _lang));
        return '<div class="wrp-opt-l"><span>' + esc(t('optDepart')) + '</span>' +
            '<input type="datetime-local" data-o="depart" min="' + maintenant + '" max="' + max + '" value="' + (depart ? instantVersMur(depart.getTime(), tz) : '') + '">' +
            '<button type="button" class="wrp-btn wrp-btn-neutral" data-o="maintenant"' + (depart ? '' : ' hidden') + '>' + esc(t('now')) + '</button></div>' +
            '<p class="wrp-opt-heure">' + esc(texteHeureLieu()) + '</p>' +
            '<div class="wrp-opt-l"><span>' + esc(t('optVehicle')) + '</span><select data-o="vehicule">' +
            VEHICULES.map(v => '<option value="' + v + '"' + (opts.vehicule === v ? ' selected' : '') + '>' + esc(t('veh_' + v)) + '</option>').join('') + '</select></div>' +
            '<div class="wrp-opt-l"><span>' + esc(t('optAvoid')) + '</span>' +
            EVITER.map(e => '<label><input type="checkbox" data-o="eviter" value="' + e.id + '"' + (opts.eviter.includes(e.id) ? ' checked' : '') + '> ' + esc(t('av_' + e.id)) + '</label>').join('') + '</div>' +
            '<div class="wrp-opt-l"><span>' + esc(t('optTrails')) + '</span><select data-o="bitume">' +
            ['interdire', 'longues', 'autoriser'].map(v => '<option value="' + v + '"' + (opts.bitume === v ? ' selected' : '') + '>' + esc(t('tr_' + v)) + '</option>').join('') + '</select>' +
            '<label><input type="checkbox" data-o="intersections"' + (opts.intersections ? ' checked' : '') + '> ' + esc(t('optTurns')) + '</label></div>' +
            '<div class="wrp-opt-l wrp-opt-pass"><span>' + esc(t('optPass')) + '</span>' +
            (pays.length ? pays.map(x => '<label title="' + esc(x.id) + '"' + (utiles.includes(x.id) ? ' class="utile"' : '') + '><input type="checkbox" data-o="pass" value="' + esc(x.id) + '"' + (opts.pass.includes(x.id) ? ' checked' : '') + '> ' + esc(x.name) + '</label>').join('')
                : '<em>' + esc(t('noPass')) + '</em>') + '</div>' +
            '<p class="wrp-opt-note">' + esc(t('optNote')) + '</p>';
    }

    // reconstruire = true seulement à l'ouverture du volet. Sinon on ne touche qu'au résumé et à deux détails :
    // reconstruire le volet pendant qu'on y règle quelque chose renvoyait le focus en haut de page et vidait
    // une heure en cours de saisie (audit A2). Le classement des pass attend la prochaine ouverture.
    function majOptions(reconstruire) {
        if (!ovEl) return;
        const d = ovEl.querySelector('#wrp-opts');
        const sm = ovEl.querySelector('#wrp-opts-resume');
        sm.innerHTML = '<span class="wrp-opts-btn">&#x2699; ' + esc(t('optionsBtn')) + ' <span class="wrp-chev">' + (d.open ? '&#x25BE;' : '&#x25B8;') + '</span></span>' +
            '<span class="wrp-opts-res">' + esc(resumeOptions()) + '</span>';
        sm.title = t(d.open ? 'optionsTipClose' : 'optionsTip');
        const corps = ovEl.querySelector('#wrp-opts-corps');
        if (d.open && reconstruire) { corps.innerHTML = htmlOptions(); return; }
        if (!d.open) return;
        const b = corps.querySelector('[data-o="maintenant"]');
        if (b) b.hidden = !depart;
        const h = corps.querySelector('.wrp-opt-heure');
        if (h) h.textContent = texteHeureLieu();
    }

    // Tout changement d'option relance le calcul si les deux points sont posés.
    function surOption(ev) {
        const c = ev.target.closest('[data-o]');
        if (!c) return;
        const o = c.dataset.o;
        if (o === 'depart') {
            const avant = depart ? depart.getTime() : null;
            const ms = murVersInstant(c.value, fuseau());
            if (c.value && ms != null && ms <= Date.now() + 60000) statutPassager(t('departPasse'));
            depart = ms != null && ms > Date.now() + 60000 ? new Date(ms) : null;
            if ((depart ? depart.getTime() : null) === avant) { majOptions(); return; }
        } else if (o === 'maintenant') {
            depart = null;
            const inp = ovEl.querySelector('[data-o="depart"]');
            if (inp) inp.value = '';
        }
        else if (o === 'vehicule') opts.vehicule = c.value;
        else if (o === 'bitume') opts.bitume = c.value;
        else if (o === 'intersections') opts.intersections = c.checked;
        else if (o === 'eviter' || o === 'pass') {
            const l = opts[o].filter(x => x !== c.value);
            if (c.checked) l.push(c.value);
            opts[o] = l;
        } else return;
        ecrireStock(OPTS_KEY, opts);
        majOptions();
        if (pts.A && pts.B) calculer();
    }

    function majFiche() {
        const e = ovEl && ovEl.querySelector('#wrp-fiche');
        if (!e) return;
        const f = trajet && trajet.fiche;
        if (!f) { e.hidden = true; e.innerHTML = ''; return; }
        const puce = (cls, txt, tip) => '<span class="wrp-pz ' + cls + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + esc(txt) + '</span>';
        let h = f.via ? '<span class="wrp-via">' + esc(t('via', f.via)) + '</span>' : '';
        if (f.peage != null) h += puce('peage', f.peage > 0 ? t('toll', nb(f.peage, 2)) : t('tollUnknown'), t('tollTip', distTexte(f.peageMetres)));
        f.zones.forEach(z => { h += puce(z.eviter ? 'eviter' : 'zone', z.nom, t(z.eviter ? 'zoneAvoidTip' : 'zoneTip')); });
        if (f.permis.length) h += puce('eviter', t('permits', f.permis.join(', ')));
        if (f.contourne) h += puce('info', t('bypass'), t('bypassTip'));
        if (f.nonRevetu) h += puce('info', t('unpaved'));
        const cf = trajet.carrefours;
        if (cf && (cf.echecs || cf.plafond)) h += puce('eviter', t('junctions', cf.lus, cf.total), t('junctionsTip'));
        const v = verdictVirage(trajet);
        if (v) {
            if (!v.passe) {
                const autre = trajets.findIndex(x => x !== trajet && (verdictVirage(x) || {}).passe);
                h += puce('eviter', t('turnNo'), t('turnNoTip') + (autre >= 0 ? ' ' + t('turnNoAlt', autre + 1) : ''));
            } else h += v.k >= 0 ? puce('ok', t('turnOk', v.k + 1), t('turnOkTip')) : puce('info', t('turnSilent'), t('turnSilentTip'));
        }
        const cp = trajet.comparaison;
        if (cp) {
            const nMod = cp.lignes.filter(l => l.etat === 'modifiee').length, nNou = cp.lignes.filter(l => l.etat === 'nouvelle').length;
            const nDis = cp.disparues.length, d = dateCourte(cp.ref.t);
            const avant = dureeTexte(cp.ref.secondes), apres = dureeTexte(trajet.secondes);
            const bouts = [t('refTime', avant, apres), t('refDist', distTexte(cp.ref.metres), distTexte(trajet.metres))];
            if (nDis) bouts.push(t('refGone', cp.disparues.map(y => y.txt || y.op).join(' ; ')));
            if (!cp.memesOptions) bouts.push(t('refOtherOpts'));
            const pareil = !nMod && !nNou && !nDis;
            h += puce(pareil ? 'ok' : 'zone', (pareil ? t('refSame', d) : t('refDiff', d, nMod, nNou, nDis)) + (avant !== apres ? ' · ' + avant + ' → ' + apres : ''),
                (pareil ? t('refTipSame') + ' ' : '') + bouts.join(' · '));
        }
        e.innerHTML = h;
        e.hidden = !h;
    }

    function majResume() {
        majFiche();
        majItineraires();
        majNote();
        majPuces();
        const e = ovEl && ovEl.querySelector('#wrp-statut');
        if (!e) return;
        e.innerHTML = dernierStatut ? esc(dernierStatut)
            : trajet ? '<b>' + esc(distTexte(trajet.metres)) + '</b> · ' + esc(dureeTexte(trajet.secondes)) + ' · ' + esc(t('nInstr', trajet.manoeuvres.length)) : '';
    }

    // UNE seule présentation (demande de l'auteur, 25/09) : la liste « Étapes suivantes » de l'appli, dont
    // la ligne choisie se DÉPLIE sur place en bandeau complet — bande de voies au-dessus, pastille « puis »
    // dessous — avec le même contenu que la ligne. L'ancien bandeau fixe reprenait deux règles du bandeau de
    // l'appli (ligne principale effacée quand le panneau n'a qu'une direction, icône masquée sous les voies) :
    // il disait moins que la ligne pour la même instruction.
    // Pastille « puis » (#202124) si la manœuvre suivante est à 200 m ou moins (réglage de l'appli
    // NAVIGATION_NEXT_INSTRUCTION_MAX_DISTANCE_METERS) : ligne principale, sinon direction, sinon rue.
    const PUIS_BANDEAU = 200;
    const etiquetteAnnonce = a => a.d ? (a.d >= 1000 ? nb(a.d / 1000, a.d % 1000 ? 1 : 0) + ' km' : a.d + ' m')
        : t(trajet && trajet.manoeuvres[a.k] && trajet.manoeuvres[a.k].op === 'APPROACHING_DESTINATION' ? 'atArrival' : 'here');

    // L'appli n'écrit aucune phrase dans la liste — icône, distance, puis panneau ou rue. La phrase et les
    // annonces sont notre ajout : les puces 🔊, et le verbe en infobulle.
    function ligneHTML(i, deplie, dist) {
        const m = trajet.manoeuvres[i], an = trajet.annonces;
        const L = lignes(m, deplie ? 22 : 18, true);
        const puces = an.map((a, j) => a.k === i
            ? '<button type="button" class="wrp-ann" data-ann="' + j + '" title="' + esc(texteAnnonce(a)) + '">' + esc(etiquetteAnnonce(a)) + '</button>' : '').join('');
        let voies = '', puis = '';
        if (deplie) {
            if (m.voies) voies = '<div class="wrp-nb-voies">' + voiesSVG(m.voies, 36) + '</div>';
            const suiv = trajet.manoeuvres[i + 1];
            if (suiv && suiv.troncon <= PUIS_BANDEAU) {
                const Ls = lignes(suiv, 18);
                puis = '<div class="wrp-nb-puis"><span>' + esc(t('then')) + ' ' + (Ls.l1 || Ls.l2 || esc(suiv.rue || '')) + '</span>' + icone(suiv, 26, '#ffffff', ANNEAU_SOMBRE) + '</div>';
            }
        }
        const taille = deplie ? 54 : 44;
        const c = trajet.comparaison && trajet.comparaison.lignes[i];
        const diff = !c || c.etat === 'identique' ? ''
            : c.etat === 'nouvelle' ? '<span class="wrp-diff new" title="' + esc(t('diffNewTip')) + '">' + esc(t('diffNew')) + '</span>'
            : '<span class="wrp-diff mod" title="' + esc(texteAvant(c)) + '">' + esc(t('diffMod')) + '</span>';
        const actions = deplie ? '<div class="wrp-actions"><button type="button" class="wrp-btn wrp-btn-neutral" data-act="selseg" data-i="' + i + '" title="' +
            esc(t('selSegTip')) + '">&#x2316; ' + esc(t('selSeg')) + '</button></div>' : '';
        return voies + '<div class="wrp-ligne">' +
            '<span class="wrp-fl" style="width:' + taille + 'px;height:' + taille + 'px"><span class="wrp-num">' + (i + 1) + '</span>' + icone(m, taille, '#ffffff', ANNEAU_SOMBRE) + '</span>' +
            '<span class="wrp-txt"><span class="wrp-l0"><b>' + esc(distAppli(dist == null ? m.troncon : dist)) + '</b>' +
            (m.perso ? '<span class="wrp-perso" title="' + esc(t('custom')) + '">&#x270E;</span>' : '') + diff +
            '<span class="wrp-nb-sorties">' + L.sorties + '</span></span>' +
            (L.l1 ? '<span class="wrp-l1">' + L.l1 + '</span>' : '') +
            (L.l2 ? '<span class="wrp-l2">' + L.l2 + '</span>' : '') +
            (puces ? '<span class="wrp-anns">&#x1F50A; ' + puces + '</span>' : '') + '</span></div>' + puis + actions;
    }

    function rendreTrajet() {
        if (!ovEl) return;
        const corps = ovEl.querySelector('#wrp-corps');
        const btn = ovEl.querySelector('[data-act="playall"]');
        majResume();
        deplieeIdx = -1;
        if (!trajet) {
            btn.hidden = true;
            corps.innerHTML = '<div class="wrp-vide">' + (enCalcul ? esc(t('busy'))
                : derniereErreur ? '<b class="wrp-erreur">' + esc(derniereErreur) + '</b>' : esc(t('emptyHint'))) + '</div>';
            return;
        }
        btn.hidden = false;
        trajet.comparaison = comparerRef(trajet);
        majFiche();
        corps.innerHTML = '<ol class="wrp-list">' + trajet.manoeuvres.map((m, i) =>
            '<li data-i="' + i + '" tabindex="0" title="' + esc(verbe(m)) + '">' + ligneHTML(i, false) + '</li>').join('') + '</ol>';
        montrer(0);
    }

    // Déplier la ligne k (et replier la précédente). dist : distance affichée pendant « Tout écouter »,
    // celle de l'annonce en cours, comme le compte à rebours de l'appli.
    let choisi = 0, deplieeIdx = -1, distDepliee;
    function montrer(k, dist) {
        if (!ovEl || !trajet) return;
        choisi = k;
        distDepliee = dist;
        const lis = ovEl.querySelectorAll('.wrp-list li');
        if (deplieeIdx >= 0 && deplieeIdx !== k && lis[deplieeIdx]) {
            lis[deplieeIdx].innerHTML = ligneHTML(deplieeIdx, false);
            lis[deplieeIdx].classList.remove('actif');
        }
        if (lis[k]) {
            lis[k].innerHTML = ligneHTML(k, true, dist);
            lis[k].classList.add('actif');
            lis[k].scrollIntoView({ block: 'nearest' });
        }
        deplieeIdx = k;
    }

    function arreterLecture() {
        if (lecture) lecture.stop = true;
        lecture = null;
        couperAudio();
        const b = ovEl && ovEl.querySelector('[data-act="playall"]');
        if (b) b.textContent = t('playAll');
    }

    async function toutEcouter() {
        if (lecture) { arreterLecture(); return; }
        const moi = { stop: false };
        lecture = moi;
        ovEl.querySelector('[data-act="playall"]').textContent = t('stop');
        // Conduite simulée : les annonces dans l'ordre du trajet, le bandeau à la distance annoncée.
        let prec = -1;
        for (const a of trajet.annonces) {
            if (moi.stop) break;
            const m = trajet.manoeuvres[a.k];
            montrer(a.k, a.d || FINALE);
            if (a.k !== prec) { aller(m); prec = a.k; }
            // Sans voix, défiler la carte en silence n'apprend rien : on s'arrête (le message dit pourquoi).
            if (await dire(a) === 'sansVoix') break;
            if (!moi.stop) await new Promise(r => setTimeout(r, 400));
        }
        if (lecture === moi) arreterLecture();
    }

    // =====================================================================
    //  Itinéraires, virage testé, sélection, référence (avant / après), lien
    // =====================================================================

    // ---- Autres itinéraires ------------------------------------------------------------------------
    // Demandés au serveur (nPaths=3 : 4 rendus le 27/09/2026 sur Uzès → Nîmes, le premier marqué « Best »),
    // gardés dans SON ordre : le premier est celui que l'appli propose d'office.
    function analyserTous(j) {
        const n = Array.isArray(j.alternatives) ? j.alternatives.length : 1;
        const tous = [analyser(j, 0)];
        for (let k = 1; k < n; k++) {
            try { tous.push(analyser(j, k)); } catch (e) { log('itinéraire ' + (k + 1) + ' : ' + e.message); }
        }
        return tous;
    }

    function majItineraires() {
        const e = ovEl && ovEl.querySelector('#wrp-alts');
        if (!e) return;
        if (!trajet || trajets.length < 2) { e.hidden = true; e.innerHTML = ''; return; }
        e.innerHTML = trajets.map((x, k) => '<button type="button" class="wrp-alt' + (x === trajet ? ' on' : '') + '" data-alt="' + k +
            '" aria-pressed="' + (x === trajet) + '" title="' + esc(t('altTip', k + 1)) + '"><b>' + esc(dureeTexte(x.secondes)) + '</b> · ' +
            esc(distTexte(x.metres)) + (x.fiche && x.fiche.via ? ' · ' + esc(x.fiche.via) : '') + '</button>').join('');
        e.hidden = false;
    }

    function choisirItineraire(k) {
        if (!trajets[k] || trajets[k] === trajet) return;
        arreterLecture();
        choixAlt = k;
        trajet = trajets[k];
        rendreTrajet();
        dessiner();
        statut('');
        montrerVirageTeste();
        if (!trajet.completion) trajet.completion = completerCarrefours(trajet, generation);
    }

    // ---- Sélectionner dans WME ce qu'une ligne décrit ----------------------------------------------
    // Le segment d'APPROCHE : il porte les voies, et ses flèches de virage mènent à l'instruction
    // personnalisée. ⛔ Aucun clic sur une flèche : un clic BASCULE le virage (vécu, cf. mémoire SDK).
    // setSelection n'ajoute aucune action. Hors de la vue, le segment n'est pas chargé : on centre la
    // carte (zoom 16 au moins, sinon WME ne charge pas les segments), puis on attend qu'il le soit.
    async function selectionnerApproche(k) {
        const m = trajet && trajet.manoeuvres[k];
        if (!m) return;
        const R = trajet.R, x = R[m.i != null ? m.i : R.length - 1];
        const id = x && x.path && x.path.segmentId;
        if (!id) return;
        const charge = () => { try { return !!sdk.DataModel.Segments.getById({ segmentId: id }); } catch (e) { return false; } };
        if (!charge()) {
            let z = 17;
            try { z = Math.max(16, sdk.Map.getZoomLevel()); } catch (e) { }
            sdk.Map.setMapCenter({ lonLat: { lon: m.lon, lat: m.lat }, zoomLevel: z });
            for (let n = 0; n < 40 && !charge(); n++) await new Promise(r => setTimeout(r, 250));
        } else aller(m);
        if (!charge()) { statutPassager(t('selAbsent')); return; }
        try { sdk.Editing.setSelection({ selection: { ids: [id], objectType: 'segment' } }); }
        catch (e) { statutPassager(t('selAbsent')); log('sélection : ' + e.message); }
    }

    // ---- Tester un virage ----------------------------------------------------------------------------
    // Deux segments sélectionnés qui se touchent par UN nœud : départ sur le premier, arrivée sur le
    // second, chacun à mi-longueur (150 m au plus du nœud). Deux nœuds communs (boucle) : sens ambigu, refusé.
    let virageInverse = false, virageCle = '';
    function virageSelection() {
        let sel;
        try { sel = sdk.Editing.getSelection(); } catch (e) { return null; }
        if (!sel || sel.objectType !== 'segment' || !sel.ids || sel.ids.length !== 2) return null;
        let s1, s2;
        try { [s1, s2] = sel.ids.map(id => sdk.DataModel.Segments.getById({ segmentId: id })); } catch (e) { return null; }
        if (!s1 || !s2) return null;
        const communs = [s1.fromNodeId, s1.toNodeId].filter(n => n != null && (n === s2.fromNodeId || n === s2.toNodeId));
        if (communs.length !== 1) return null;
        const cle = sel.ids.join('>');
        if (cle !== virageCle) { virageCle = cle; virageInverse = false; }
        return virageInverse ? { de: s2, vers: s1, noeud: communs[0] } : { de: s1, vers: s2, noeud: communs[0] };
    }

    function barreVirageHTML(v) {
        const nom = s => nomRue(s.primaryStreetId) || t('unnamed');
        const teste = virageTeste && virageTeste.de === v.de.id && virageTeste.vers === v.vers.id && trajet ? verdictVirage(trajet) : null;
        const signe = !teste ? '' : '<span class="wrp-pz ' + (!teste.passe ? 'eviter' : teste.k >= 0 ? 'ok' : 'info') + '">' +
            (teste.passe ? '&#x2714;' : '&#x2718;') + '</span>';
        return '<span class="wrp-bar-lbl" title="' + SCRIPT_NAME + '">' + esc(t('turnLbl')) + '</span>' +
            '<span class="wrp-bar-txt" title="' + esc(nom(v.de) + ' → ' + nom(v.vers)) + '">' + esc(nom(v.de)) + ' → ' + esc(nom(v.vers)) + '</span>' + signe +
            '<button type="button" class="wrp-chip" data-bar="inverser" title="' + esc(t('turnSwap')) + '">&#x21C5;</button>' +
            '<button type="button" class="wrp-btn wrp-btn-neutral" data-bar="virage" title="' + esc(t('turnTestTip')) + '">' + esc(t('turnTest')) + '</button>';
    }

    // Le point à d mètres du nœud en remontant le segment (d = mi-longueur, 150 m au plus).
    function pointPresDuNoeud(s, noeud) {
        const c = s.toNodeId === noeud ? s.geometry.coordinates.slice().reverse() : s.geometry.coordinates.slice();
        let total = 0;
        for (let i = 1; i < c.length; i++) total += metres(c[i - 1], c[i]);
        let reste = Math.min(total / 2, 150);
        for (let i = 1; i < c.length; i++) {
            const d = metres(c[i - 1], c[i]);
            if (reste <= d && d > 0) {
                const u = reste / d;
                return [c[i - 1][0] + u * (c[i][0] - c[i - 1][0]), c[i - 1][1] + u * (c[i][1] - c[i - 1][1])];
            }
            reste -= d;
        }
        return c[c.length - 1];
    }

    function testerVirage() {
        const v = virageSelection();
        if (!v) { statutPassager(t('turnBadSel')); return; }
        const a = pointPresDuNoeud(v.de, v.noeud), b = pointPresDuNoeud(v.vers, v.noeud);
        pts.A = { lon: a[0], lat: a[1], label: t('segLabel', nomRue(v.de.primaryStreetId), v.de.id), ref: 'segment:' + v.de.id };
        virageTeste = { de: v.de.id, vers: v.vers.id };
        poserPoint('B', { lon: b[0], lat: b[1], label: t('segLabel', nomRue(v.vers.primaryStreetId), v.vers.id), ref: 'segment:' + v.vers.id }, true);
    }

    // Le trajet prend-il le virage ? k = la ligne de son instruction, -1 s'il le prend sans rien dire.
    function verdictVirage(tr) {
        if (!virageTeste || !tr || !tr.R) return null;
        const R = tr.R;
        for (let i = 0; i + 1 < R.length; i++) {
            if (R[i].path.segmentId === virageTeste.de && R[i + 1].path.segmentId === virageTeste.vers) {
                return { passe: true, k: tr.manoeuvres.findIndex(m => m.i === i) };
            }
        }
        return { passe: false, k: -1 };
    }

    function montrerVirageTeste() {
        const v = verdictVirage(trajet);
        if (v && v.k >= 0) montrer(v.k);
        majBarre();
    }

    // ---- Référence : avant / après une modification ----------------------------------------------------
    // Le calcul de Waze se fait sur la carte PUBLIÉE : une modification ne l'atteint qu'après la mise à
    // jour de cette carte par Waze (délai fixé par Waze, NON mesuré). D'où une référence gardée dans le
    // navigateur, à laquelle chaque calcul entre les mêmes départ et arrivée est comparé, même des jours
    // plus tard. À l'enregistrement dans WME, le trajet affiché (calculé AVANT) est gardé d'office.
    const REFS_KEY = 'wrp.refs', REFS_MAX = 10, MEME_POINT_M = 15, APPARIER_M = 25;
    const lireRefs = () => { const l = lireStock(REFS_KEY, []); return Array.isArray(l) ? l.filter(r => r && r.A && r.B && Array.isArray(r.l)) : []; };
    const optsCalcul = () => ({ vehicule: opts.vehicule, eviter: opts.eviter.slice().sort(), bitume: opts.bitume, intersections: !!opts.intersections, pass: passActifs().slice().sort() });
    const memesPoints = (r, A, B) => metres([r.A.lon, r.A.lat], [A.lon, A.lat]) < MEME_POINT_M && metres([r.B.lon, r.B.lat], [B.lon, B.lat]) < MEME_POINT_M;
    const refPour = (A, B) => A && B ? lireRefs().find(r => memesPoints(r, A, B)) || null : null;
    const dateCourte = ms => new Intl.DateTimeFormat(_lang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms);
    const heureCourte = ms => new Intl.DateTimeFormat(_lang, { hour: '2-digit', minute: '2-digit' }).format(ms);
    // \x22 et non un guillemet dans les expressions : tools/check-idents.js lirait sinon une chaîne.
    const texteBrut = html => String(html || '').replace(/<img[^>]*alt=[\x22]([^\x22]*)[\x22][^>]*>/g, '[$1]').replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '\x22').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();

    // Ce qu'on compare d'une ligne : l'instruction, ce que l'écran montre, les voies, ✎ et le texte vocal
    // personnalisé. Pas la phrase dite, qui dépend de la voix choisie.
    function empreinte(tr) {
        return tr.manoeuvres.map(m => {
            const L = lignes(m, 18, true);
            return {
                op: m.op, arg: m.arg || 0, lon: +m.lon.toFixed(6), lat: +m.lat.toFixed(6),
                txt: [texteBrut(L.l1), texteBrut(L.l2), texteBrut(L.sorties)].filter(x => x).join(' · '),
                voies: m.voies ? m.voies.map(v => v.map(x => x.a + (x.sel ? '*' : '')).join('/')).join('|') : '',
                perso: !!m.perso, tts: (m.perso && m.tg && m.tg.tts) || '',
            };
        });
    }

    // Chaque ligne est appariée à la ligne de la référence la plus proche (25 m) encore libre.
    function comparerAvec(ref, tr) {
        const avant = ref.l, pris = new Set();
        const res = empreinte(tr).map(x => {
            let j = -1, dmin = APPARIER_M;
            avant.forEach((y, n) => {
                if (pris.has(n)) return;
                const d = metres([x.lon, x.lat], [y.lon, y.lat]);
                if (d < dmin) { dmin = d; j = n; }
            });
            if (j < 0) return { etat: 'nouvelle' };
            pris.add(j);
            const y = avant[j], ecarts = [];
            if (x.op !== y.op || x.arg !== y.arg) ecarts.push('op');
            if (x.txt !== y.txt) ecarts.push('txt');
            if (x.voies !== y.voies) ecarts.push('voies');
            if (x.perso !== y.perso) ecarts.push('perso');
            if (x.tts !== y.tts) ecarts.push('tts');
            return ecarts.length ? { etat: 'modifiee', avant: y, ecarts } : { etat: 'identique' };
        });
        return { ref, lignes: res, disparues: avant.filter((y, n) => !pris.has(n)), memesOptions: JSON.stringify(ref.o) === JSON.stringify(optsCalcul()) };
    }
    const comparerRef = tr => { const r = tr && refPour(pts.A, pts.B); return r ? comparerAvec(r, tr) : null; };

    // Avec une référence, l'itinéraire montré d'office est celui qui lui ressemble le plus (le serveur
    // peut changer l'ordre d'un jour à l'autre) ; sans référence, le premier.
    function choixSelonReference(tous) {
        const ref = refPour(pts.A, pts.B);
        if (!ref || tous.length < 2) return 0;
        let choix = 0, mieux = Infinity;
        tous.forEach((x, k) => {
            const c = comparerAvec(ref, x);
            const ecart = c.disparues.length + c.lignes.filter(l => l.etat !== 'identique').length;
            if (ecart < mieux) { mieux = ecart; choix = k; }
        });
        return choix;
    }

    function texteAvant(c) {
        const y = c.avant, b = [];
        if (c.ecarts.includes('op') || c.ecarts.includes('txt')) b.push(y.txt || y.op);
        if (c.ecarts.includes('voies')) b.push(t('dLanes'));
        if (c.ecarts.includes('perso')) b.push(t(y.perso ? 'dPersoOff' : 'dPersoOn'));
        if (c.ecarts.includes('tts') && y.tts) b.push(t('dVoice', y.tts));
        return t('diffBefore') + '\u00a0: ' + b.join(' · ');
    }

    // Les voies des carrefours hors de la vue arrivent après l'affichage : la référence les attend,
    // sinon le calcul suivant les verrait « modifiées ».
    async function epingler(silencieux) {
        const tr = trajet;
        if (!tr || !pts.A || !pts.B) return;
        try { await tr.completion; } catch (e) { }
        if (tr !== trajet) return;
        const pt = x => ({ lon: x.lon, lat: x.lat, label: x.label });
        const refs = lireRefs().filter(r => !memesPoints(r, pts.A, pts.B));
        refs.unshift({ t: Date.now(), A: pt(pts.A), B: pt(pts.B), o: optsCalcul(), metres: tr.metres, secondes: tr.secondes, via: tr.fiche.via, l: empreinte(tr) });
        ecrireStock(REFS_KEY, refs.slice(0, REFS_MAX));
        rendreTrajet();
        majRefsOnglet();
        if (!silencieux) statutPassager(t('pinDone'));
    }

    function majPuces() {
        const pin = ovEl && ovEl.querySelector('[data-act="pin"]');
        const lien = ovEl && ovEl.querySelector('[data-act="link"]');
        if (lien) lien.hidden = !(pts.A && pts.B);
        if (!pin) return;
        pin.hidden = !trajet;
        const r = trajet && refPour(pts.A, pts.B);
        pin.classList.toggle('on', !!r);
        pin.title = r ? t('pinReplace', dateCourte(r.t)) : t('pinTip');
    }

    let noteEnreg = '';
    function majNote() {
        const e = ovEl && ovEl.querySelector('#wrp-note');
        if (!e) return;
        e.hidden = !noteEnreg;
        e.innerHTML = noteEnreg ? '<span>' + esc(noteEnreg) + '</span><button type="button" class="wrp-chip wrp-croix" data-act="note-x" title="' + esc(t('close')) + '">&#x2715;</button>' : '';
    }

    // wme-save-finished rend {success} (lu dans le code de WME le 27/09/2026 : save:success / save:failure).
    function surEnregistrement(e) {
        if (!e || !e.success || !trajet || !pts.A || !pts.B) return;
        const deja = refPour(pts.A, pts.B);
        noteEnreg = t(deja ? 'savedHasRef' : 'savedRef', heureCourte(Date.now()));
        if (!deja) epingler(true);
        majNote();
    }

    function majRefsOnglet() {
        const e = paneEl && paneEl.querySelector('#wrp-refs');
        if (!e) return;
        const refs = lireRefs();
        e.innerHTML = refs.length ? '<ul class="wrp-refs">' + refs.map((r, k) => '<li><span class="wrp-ref-txt" title="' + esc(r.A.label + ' → ' + r.B.label) + '"><b>' +
            esc(dateCourte(r.t)) + '</b> · ' + esc(r.A.label) + ' → ' + esc(r.B.label) + '</span>' +
            '<button type="button" class="wrp-btn wrp-btn-neutral" data-ref="' + k + '">' + esc(t('refOpen')) + '</button>' +
            '<button type="button" class="wrp-chip wrp-croix" data-refx="' + k + '" title="' + esc(t('refDel')) + '">&#x2715;</button></li>').join('') + '</ul>'
            : '<p class="wrp-hint">' + esc(t('refsNone')) + '</p>';
    }

    // Rouvrir une référence reprend ses options : sinon la comparaison mêlerait deux calculs différents.
    // Comme pour un lien, elles valent pour ce trajet et ne sont PAS enregistrées : les réglages de l'éditeur
    // ne changent que par le volet des options (la 0.15.00 les écrasait).
    function rouvrirRef(k) {
        const r = lireRefs()[k];
        if (!r) return;
        if (r.o) {
            if (VEHICULES.includes(r.o.vehicule)) opts.vehicule = r.o.vehicule;
            if (Array.isArray(r.o.eviter)) opts.eviter = r.o.eviter.filter(x => EVITER.some(e => e.id === x));
            if (['interdire', 'longues', 'autoriser'].includes(r.o.bitume)) opts.bitume = r.o.bitume;
            opts.intersections = !!r.o.intersections;
            if (Array.isArray(r.o.pass)) opts.pass = r.o.pass.slice();
            majOptions(true);
        }
        try { sdk.Map.setMapCenter({ lonLat: { lon: (r.A.lon + r.B.lon) / 2, lat: (r.A.lat + r.B.lat) / 2 } }); } catch (e) { }
        pts.A = Object.assign({}, r.A);
        poserPoint('B', Object.assign({}, r.B));
        ouvrirFenetre(true);
    }

    function supprimerRef(k) {
        const refs = lireRefs();
        refs.splice(k, 1);
        ecrireStock(REFS_KEY, refs);
        majRefsOnglet();
        if (trajet) rendreTrajet();
    }

    // ---- Lien à partager --------------------------------------------------------------------------------
    // Le trajet voyage dans l'adresse de WME : `wrp=lonA,latA~lonB,latB` y survit au démarrage (mesuré le
    // 27/09/2026), avec les options en paramètres voisins (un pass par `wrpp`). Départ : maintenant (une
    // heure n'a de sens que pour celui qui l'a choisie).
    // 🔴 On ne peut PAS retirer ces paramètres de l'adresse : WME en garde des copies internes
    // (W.app._urlParams et d'autres) et les y remet à chaque sélection (mesuré le 27/09). Le lien est donc lu
    // UNE fois par onglet (sessionStorage survit au rechargement, pas à un nouvel onglet) : recharger la page
    // ne relance pas le calcul et ne réimpose pas ses options.
    const LIEN_LU_KEY = 'wrp.lienLu';
    function lienTrajet() {
        const f = x => x.toFixed(6);
        const ici = new URLSearchParams(location.search), u = new URL(location.origin + location.pathname);
        if (ici.get('env')) u.searchParams.set('env', ici.get('env'));
        u.searchParams.set('lat', f((pts.A.lat + pts.B.lat) / 2));
        u.searchParams.set('lon', f((pts.A.lon + pts.B.lon) / 2));
        let z = 16;
        try { z = sdk.Map.getZoomLevel(); } catch (e) { }
        u.searchParams.set('zoomLevel', String(z));
        u.searchParams.set('wrp', f(pts.A.lon) + ',' + f(pts.A.lat) + '~' + f(pts.B.lon) + ',' + f(pts.B.lat));
        u.searchParams.set('wrpv', opts.vehicule);
        u.searchParams.set('wrpe', opts.eviter.join(','));
        u.searchParams.set('wrpb', opts.bitume);
        u.searchParams.set('wrpi', opts.intersections ? '1' : '0');
        for (const id of passActifs()) u.searchParams.append('wrpp', id);
        return u.toString();
    }

    async function copierLien() {
        if (!pts.A || !pts.B) { statutPassager(t('needAB')); return; }
        const l = lienTrajet();
        let ok = false;
        try { await navigator.clipboard.writeText(l); ok = true; } catch (e) { }
        if (!ok) {
            const ta = document.createElement('textarea');
            ta.value = l;
            ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch (e) { }
            ta.remove();
        }
        if (!ok) log('lien : ' + l);
        statutPassager(t(ok ? 'linkCopied' : 'linkFail'));
    }

    async function lireLien() {
        let q;
        try { q = new URLSearchParams(location.search); } catch (e) { return; }
        const v = q.get('wrp');
        if (v == null) return;
        const o = { v: q.get('wrpv'), e: q.get('wrpe'), b: q.get('wrpb'), i: q.get('wrpi'), p: q.getAll('wrpp') };
        const empreinteLien = v + '|' + JSON.stringify(o);
        try {
            if (sessionStorage.getItem(LIEN_LU_KEY) === empreinteLien) return;
            sessionStorage.setItem(LIEN_LU_KEY, empreinteLien);
        } catch (e) { }
        const m = /^(-?\d{1,3}(?:\.\d+)?),(-?\d{1,2}(?:\.\d+)?)~(-?\d{1,3}(?:\.\d+)?),(-?\d{1,2}(?:\.\d+)?)$/.exec(v);
        if (!m) { log('lien illisible : ' + v); return; }
        const [lonA, latA, lonB, latB] = m.slice(1).map(Number);
        if (Math.abs(lonA) > 180 || Math.abs(lonB) > 180 || Math.abs(latA) > 90 || Math.abs(latB) > 90) return;
        if (VEHICULES.includes(o.v)) opts.vehicule = o.v;
        if (o.e != null) opts.eviter = o.e.split(',').filter(x => EVITER.some(e => e.id === x));
        if (['interdire', 'longues', 'autoriser'].includes(o.b)) opts.bitume = o.b;
        if (o.i === '0' || o.i === '1') opts.intersections = o.i === '1';
        opts.pass = o.p.filter(x => x);
        // Les options du lien valent pour ce trajet et ne sont pas enregistrées (même règle que rouvrirRef).
        majOptions(true);
        // Les instructions personnalisées se lisent dans les données de WME : on attend qu'il en ait chargé.
        for (let n = 0; n < 40; n++) {
            let nb2 = 0;
            try { nb2 = sdk.DataModel.Segments.getAll().length; } catch (e) { }
            if (nb2) break;
            await new Promise(r => setTimeout(r, 250));
        }
        const lbl = (lat, lon) => t('ptLabel', nb(lat, 5), nb(lon, 5));
        pts.A = { lon: lonA, lat: latA, label: lbl(latA, lonA) };
        poserPoint('B', { lon: lonB, lat: latB, label: lbl(latB, lonB) });
        ouvrirFenetre(false);
        statutPassager(t('linkIn'));
    }


    // =====================================================================
    //  INIT
    // =====================================================================

    const init = async () => {
        if (pw.__WRP_LOADED) return;
        pw.__WRP_LOADED = true;

        sdk = pw.getWmeSdk({ scriptId: SCRIPT_ID, scriptName: SCRIPT_NAME });
        _lang = detectLang();

        const st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);

        poserCalques();
        poserCaseCalques();
        construireFenetre();
        try {
            const res = await sdk.Sidebar.registerScriptTab();
            res.tabLabel.innerHTML = '<span title="' + SCRIPT_NAME + '" style="display:inline-flex;vertical-align:middle">' + iconeScript(20) + '</span>';
            paneEl = res.tabPane;
            paneEl.innerHTML = htmlOnglet();
            brancherOnglet();
        } catch (e) { log('onglet : ' + e.message); }
        // Le conteneur de boutons n'existe pas forcément au démarrage, et WME le reconstruit parfois.
        poserFab();
        setInterval(poserFab, 2000);
        verifierMaj();
        // Déclarés sans touches, pour ne rien prendre à un autre script : chacun les attribue
        // dans Paramètres › Raccourcis clavier.
        for (const k of ['A', 'B']) {
            try {
                sdk.Shortcuts.createShortcut({ shortcutId: 'wrp-point-' + k.toLowerCase(), shortcutKeys: null, description: t('sc' + k), callback: () => prendreCurseur(k) });
            } catch (e) { log('raccourci ' + k + ' : ' + e.message); }
        }
        try {
            sdk.Events.on({ eventName: 'wme-map-mouse-move', eventHandler: e => { curseur = { lon: e.lon, lat: e.lat }; } });
            sdk.Events.on({ eventName: 'wme-selection-changed', eventHandler: planifierPlacement });
            sdk.Events.on({ eventName: 'wme-save-finished', eventHandler: surEnregistrement });
        } catch (e) { log('événements : ' + e.message); }
        // Le panneau se re-rend aussi sans changement de sélection (onglets, enregistrement).
        new MutationObserver(planifierPlacement).observe(document.getElementById('edit-panel') || document.body, { childList: true, subtree: true });
        planifierPlacement();
        lireLien();

        log('v' + VERSION + ' prêt — langue ' + _lang);
    };

    // Démarrage dès que le SDK est prêt, à TOUS les zooms (comme WNA et WZM) : « wme-ready » n'arrive qu'à un zoom
    // éditable (≥ 12), et le script — son bouton de carte compris — restait absent tant qu'on regardait la carte de
    // loin (demande de l'auteur, 04/10/2026). Garde : wme-initialized et wme-ready peuvent arriver tous les deux.
    (() => {
        let lance = false;
        const go = () => { if (lance) return; lance = true; clearInterval(minuterie); Promise.resolve(pw.SDK_INITIALIZED).then(init); };
        const pret = () => !!(pw.SDK_INITIALIZED || (pw.W && pw.W.userscripts && pw.W.userscripts.state && pw.W.userscripts.state.isReady));
        const minuterie = setInterval(() => { if (pret()) go(); }, 300);
        if (pret()) go();
        document.addEventListener('wme-initialized', go, { once: true });
        document.addEventListener('wme-ready', go, { once: true });
    })();

})();

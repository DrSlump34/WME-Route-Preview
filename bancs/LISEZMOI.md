# Bancs d'essai

Réponses réelles du calcul d'itinéraire de la Live Map, pour éprouver le script sans WME : `node tools/rejouer-bancs.js` les rejoue sur le script livré et compare ce qu'il affiche et dit à `attendu/` (`--maj` réécrit la référence, après avoir vérifié que l'écart est voulu).

- `trajet_montpellier_lattes.json` — 8,4 km, 21 instructions, ronds-points, zones Crit'Air et « Montpellier Écusson ».
- `trajet_rond-point_D26_Donzere.json` — rond-point à instruction personnalisée posée sur le virage de sortie (« D26: Donzère »).
- `trajet_bollene_A7_sortie19.json` — Bollène → A7 nord : sortie de rond-point vers l'A7, panneau de sortie 19, écussons A7/E15, paliers d'autoroute.
- `trajet_bollene_A7_panneaux_serveur.json` — le même trajet demandé avec `GENERATE_ROAD_SIGNS` : les panneaux du serveur (`roadSign`) sur chaque tronçon.
- `trajet_milton_keynes_uk.json` — conduite à gauche (Royaume-Uni), six ronds-points.
- `trajet_uzes_nimes_alternatives.json` — Uzès → Nîmes demandé avec `nPaths=3` : quatre itinéraires. Rejoué aussi par `node tools/banc-nouveautes.js` (itinéraires, comparaison à une référence, virage testé).

Hors du dépôt public : les essais de la voix de Waze (enregistrements) et un trajet personnel de l'auteur.

# Options du calcul d'itinéraire Live Map — mesurées le 25/09/2026

Appel : `https://routing-livemap-row.waze.com/RoutingManager/routingRequest?from=x:<lon> y:<lat>&to=…`
(par `GM_xmlhttpRequest`, WME bloquant l'appel direct). Banc : Montpellier (Écusson) → Lattes, qui touche
la zone restreinte « Montpellier Écusson ».

| Paramètre | Effet mesuré |
|---|---|
| `at=0` | maintenant, **avec le trafic réel** (`totalRouteTime` ≠ `totalRouteTimeWithoutRealtime`) ; deux appels identiques peuvent rendre deux trajets voisins (A709 / Avenue de la Mer). |
| `at=N` (N > 0) | départ **dans N minutes**, trafic **habituel** seulement (les deux temps sont égaux) ; le trajet change avec l'heure : `at=900` (la nuit) → M986, 1 096 s au lieu de ~1 380 s. Accepté jusqu'à 20 160 (14 jours). |
| `at=-60` | accepté sans erreur, rien ne prouve qu'il remonte dans le passé. |
| `subscription=<id>` | **pass de zone** : avec `france-montpellier-zone`, `isRestricted` passe à `false` et `areasToAvoid` se vide — le calcul entre dans la zone. |
| `subscription=a&subscription=b` | **plusieurs pass : paramètre RÉPÉTÉ.** ⚠️ `a,b` et `a;b` sont acceptés **sans erreur mais sans effet**. |
| `vehicleType=MOTORCYCLE` | pris en compte : 1 103 s contre 1 384 s en voiture. |
| `vehicleType=TAXI`, `EV`, `TRUCK`, `PRIVATE` | acceptés ; aucun effet visible sur ce trajet. |
| `vehicleType=BIKE` | refusé : `No enum constant …DriveProfile.VehicleType.BIKE` (liste fermée). |

Options d'évitement (`options=`, liste `NOM:t` séparée par des virgules), banc Bollène → A7 sortie 19 (22,6 km de péage) :
`AVOID_TOLL_ROADS:t` → D458, péage 0 ; `AVOID_PRIMARIES:t` (= « éviter les autoroutes » de l'appli) → D458 ;
`AVOID_FERRIES:t` accepté ; `AVOID_HIGHWAYS` **refusé** (`No enum constant …RoutingOption.AVOID_HIGHWAYS`).

**Liste complète des options de l'appli** (enum `com.waze.modules.d.dd`, APK 5.24) : AVOID_PRIMARIES, AVOID_TRAILS,
AVOID_LONG_TRAILS, PREFER_SAME_STREET, ALLOW_UNKNOWN_DIRECTIONS, AVOID_TOLL_ROADS, PREFER_UNKNOWN_DIRECTIONS,
AVOID_DANGER_ZONES, USE_EXTENDED_INSTRUCTIONS, ALLOW_UTURNS, AVOID_FERRIES, ORIGIN_IN_DANGER_ZONE,
DESTINATION_IN_DANGER_ZONE, ADD_HOV_ROUTES, ADD_HOV_INSTRUCTIONS, GENERATE_LANE_GUIDANCE,
CLIENT_INSTRUCTION_LANE_GUIDANCE_SEPARATION, USE_PETA, **GENERATE_ROAD_SIGNS**, AVOID_DANGEROUS_TURNS, IGNORE_PREFERRED_ROUTES.
Écran « Navigation » de l'appli (capture de l'auteur, 25/09) : routes non bitumées Interdire / Éviter les longues /
Autoriser ⇒ AVOID_TRAILS / AVOID_LONG_TRAILS / rien ; « Éviter les intersections difficiles » ⇒ AVOID_DANGEROUS_TURNS.

⭐ **`GENERATE_ROAD_SIGNS:t` ⇒ chaque tronçon reçoit un `roadSign`** = le RoadSign de l'appli : `primaryMarkup` (jetons
`$RS-n`), `secondaryMarkup`, `roadShields[{type,text}]`, `exitSigns[{type,text}]`, `textRepresentation` — y compris
l'écusson de la rue sur les tronçons SANS instruction (« $RS-0 » = A7). Sans l'option : aucun.

Les identifiants de pass du pays sont dans le SDK : `sdk.DataModel.Countries.getTopCountry().restrictionSubscriptions`
(`[{id, name}]`, ex. `eco-permit-spain` / « ES: Etiqueta ECO »). La réponse dit aussi `allRoutePermits`
(pass concernés par le trajet) et `requiredPermits`.

Non vérifié : que les restrictions **horaires** d'une zone soient évaluées à l'heure `at`.

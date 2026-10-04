# WME Route Preview — historique des versions

## 0.15.04

- Mises à jour : le script les cherchait sur la fiche GreasyFork, supprimée (réponse 404) — plus aucune installation n'en recevait. Elles viennent maintenant du dépôt GitHub. Une installation faite depuis GreasyFork doit être refaite une fois depuis le lien du README.
- Ligne dépliée par une annonce : elle montre la distance de l'annonce (« 40 m » pour « à l'intersection »), comme le compte à rebours de l'appli ; elle dit maintenant aussi la longueur du tronçon (« 40 m · tronçon 21 km »), qu'on croyait remplacée.
- 📌 ne replie plus la liste sur la première ligne : celle qu'on regardait reste dépliée.

## 0.15.03

- Démarrage à tous les zooms : le script (bouton de carte, onglet) n'attendait que les zooms éditables de WME ; il démarre maintenant dès que le SDK est prêt, même la carte vue de loin.

## 0.15.02

- La ligne « en direction de » dessine ses écussons (« [D528] Chevaigné ») au lieu d'en écrire le seul numéro en texte (signalé par milkyway35). Une référence gardée avant cette version peut donc voir ces lignes « modifiée » au prochain calcul.

## 0.15.01

- Lien à partager : lu une seule fois par onglet. WME remet les paramètres du lien dans l'adresse à chaque sélection : recharger la page relançait le calcul et réimposait les options du lien.
- « Rouvrir » une référence n'enregistre plus ses options dans les réglages : elles valent pour ce trajet, comme celles d'un lien.

## 0.15.00

- **Avant / après une modification** : 📌 garde le trajet comme référence (d'office quand on enregistre dans WME, puisqu'il a été calculé avant) ; chaque calcul suivant entre les mêmes départ et arrivée lui est comparé — lignes « modifiée » (l'infobulle dit ce qu'il y avait) ou « nouvelle », instructions disparues, durée et distance. Références listées dans l'onglet Scripts (rouvrir, supprimer), dans le navigateur seulement.
- **Autres itinéraires** : ceux que propose le serveur (jusqu'à 4), sous le résumé ; les autres restent en gris sur la carte.
- **Tester un virage** : deux segments contigus sélectionnés ⇒ la ligne du panneau propose « Tester » (⇅ pour le sens) ; la fenêtre dit si le trajet prend le virage, et avec quelle instruction.
- **Sélectionner le segment d'approche** depuis la ligne dépliée : ses voies, ses flèches de virage.
- **Lien à partager** (🔗) : départ, arrivée et options dans l'adresse de WME.
- Charte : pilule pleine #1976d2 ; insécables de la typographie française dans l'interface.

## 0.14.05

- Un point posé ou un trajet calculé pendant que la fenêtre est fermée (ligne TRAJET du panneau, raccourcis) s'affiche sur la carte ; seule la fermeture de la fenêtre le retire.

## 0.14.04

- Fermer la fenêtre retire le trajet de la carte (tracé, manœuvres, départ, arrivée) ; la rouvrir le remontre. La case du sélecteur de calques garde son rôle.

## 0.14.03

- Nouvelle icône, tirée de l'illustration du projet : flèche de virage et haut-parleur (bouton de la carte, onglet, fenêtre, gestionnaire de scripts).
- Mise à jour automatique par GreasyFork déclarée dans l'en-tête (`@downloadURL`, `@updateURL`), y compris pour une copie installée autrement.
- Liens GreasyFork et GitHub au pied de l'onglet Scripts.

## 0.14.02 — première publication

- Publication sur GitHub et GreasyFork : liens vers la page du projet et les Issues ; la détection de nouvelle version suit l'adresse de mise à jour du gestionnaire de scripts (le .meta.js de GreasyFork).

## 0.14.01

- Interrupteur éteint lisible : rail #8a94a0 (3,08:1) au lieu de #ccc (1,61:1), WCAG 1.4.11.

## 0.14.00 — corrections de l'audit du 25/09 

- **Le trajet ne vole plus les clics** : les segments, nœuds, départ et arrivée sous le tracé se sélectionnent
  (`pointerEvents: 'none'` sur les calques).
- **Heure du lieu** : le départ se lit et se saisit dans le fuseau du trajet (« Heure sur place : 11:00
  (Europe/Paris) ») ; une heure passée repasse à « maintenant » en le disant.
- **Options** : le volet ne se reconstruit plus pendant qu'on le règle (focus, heure en cours de saisie).
- **Audio** : une puce 🔊 pendant « Tout écouter » ne fige plus rien ; la voix se tait vraiment après Arrêter,
  la fermeture, ✕ ou un recalcul ; sans voix, « Tout écouter » s'arrête.
- **Messages** : passagers (4 s) sans masquer le résumé ni « Détail » ; pendant un recalcul l'ancienne liste
  reste, grisée ; erreurs en français avec le geste à faire ; délai de 70 s ; recherche en échec ≠ aucun
  résultat ; carrefours hors de la vue non lus signalés dans la fiche, lignes complétées sur place.
- **Exactitude** : « 2 h 00 » (et non « 1 h 60 ») ; « puis » + arrivée correct en allemand et néerlandais ;
  puce « à l'arrivée » ; rond-point : l'instruction posée sur l'entrée l'emporte ; même portée pour la rue et
  l'écusson ; écusson du serveur seulement si la rue ne change pas.
- **Cohabitation** : Ctrl / Méta / Alt ne sont plus avalés (Ctrl+S) ; bêta sans langue dans l'adresse ;
  case « WME Route Preview » dans le sélecteur de calques.
- **Accessibilité** : contrastes ≥ 4,5:1, focus visible sur l'en-tête et l'interrupteur, focus porté à
  l'ouverture et rendu à la fermeture, lignes de la liste au clavier (Entrée, Espace).
- **Filet** : `node tools/rejouer-bancs.js` rejoue les 6 trajets enregistrés sur le script livré et compare à
  `bancs/attendu/` (vérifié : il détecte la régression de la 0.11.00). Version vérifiée au plus une fois par jour.

## 0.13.00 — une icône, la nouvelle version signalée, un onglet d'aide

- **Une seule icône** : celle du bouton de la carte, dans l'onglet Scripts, son titre et l'en-tête de la fenêtre.
- **Nouvelle version** : comme WCT, pastille rouge dans l'en-tête (et rappel dans l'onglet) seulement quand une
  version publiée est strictement plus récente ; un clic ouvre le fichier pour la mise à jour. Tant que le dépôt
  n'est pas publié, elle reste éteinte.
- **« ⚙ Options du calcul ▸ »** : un vrai bouton, avec le résumé à côté.
- **Onglet Scripts** calqué sur WCT / WJN : réglages (interrupteur, voix pleine largeur) et **aide en volets** —
  poser départ et arrivée, la fenêtre, la liste et les annonces, les options, d'où viennent les données.

## 0.12.00 — une seule liste, la ligne choisie se déplie

- Plus de bandeau fixe : il disait moins que la ligne de la liste pour la même instruction (il reprenait
  deux règles du bandeau de l'appli). La **ligne choisie se déplie sur place** en bandeau complet — voies
  au-dessus, pastille « puis » dessous — avec le même contenu que la ligne ; « Tout écouter » suit la
  ligne en cours.
- Puces des annonces : « à l'intersection » au lieu de « au carrefour ».
- L'aide (onglet Scripts) dit d'où viennent les paliers des annonces (planificateur local de l'appli) et
  que l'appli peut parler moins souvent (annonces du serveur, mode bref) — à mesurer sur route.

## 0.11.01 — la rue et l'écusson d'une instruction ne débordent plus sur la suivante

- Signalé par l'auteur sur un trajet qu'il connaît : l'instruction 3 (tourner sur un chemin **sans nom**)
  annonçait « Rue 188 », qui est la rue de l'instruction 4 ; et l'instruction 4 montrait l'écusson
  « Av. 121 » de l'instruction 5. La rue et l'écusson se cherchent désormais sur les tronçons qui suivent la
  manœuvre **sans jamais dépasser la manœuvre suivante** ; le panneau d'un tronçon qui porte sa propre
  manœuvre n'est plus pris pour l'écusson de sa rue. (trajet de l’auteur, gardé hors du dépôt public).

## 0.11.00 — conduite à gauche

- Dans un pays où l'on roule à gauche (pays d'arrivée du trajet), les icônes de rond-point et de demi-tour
  sont celles de l'appli pour ces pays (« _uk ») : le miroir de l'icône continentale de la direction
  opposée ; l'anneau numéroté tourne dans l'autre sens, le numéro reste à l'endroit. Banc :
  [bancs/trajet_milton_keynes_uk.json](bancs/trajet_milton_keynes_uk.json).

## 0.10.00 — voies et instructions des carrefours hors de la vue

- Une fois le trajet affiché, le script lit en arrière-plan, dans le service de données de WME (celui qu'il
  appelle en se déplaçant), les carrefours du trajet que WME n'a pas chargés et qui en ont besoin : **bande
  de voies**, **texte vocal personnalisé** et ✎ se complètent sur tout le trajet (au plus 40 carrefours,
  3 lectures à la fois ; un nouveau calcul abandonne les lectures en cours).

## 0.09.00 — panneaux et écussons du serveur, sur tout le trajet

- Le calcul demande désormais les **panneaux que le serveur prépare pour l'appli** (option
  GENERATE_ROAD_SIGNS, lue dans l'APK) : ligne principale, direction, écussons, panneaux de sortie — et
  l'écusson de la rue (A7, N7…) — **sur tout le trajet, que les segments soient chargés dans WME ou non**,
  et tels que la carte PUBLIÉE les donne. WME ne sert plus qu'en repli, et pour le texte vocal personnalisé.
- ✎ ne marque plus que les instructions posées par un éditeur (vues dans WME), pas les panneaux générés.
- Règle de l'appli : sans ligne principale, le bandeau ne montre que la direction ; la liste retombe sur
  l'adresse ; la pastille « puis » prend la ligne principale, sinon la direction, sinon la rue.

## 0.08.00 — options du calcul, comme l'écran « Navigation » de l'appli

- Ligne **Options** dans la fenêtre : **départ** maintenant ou à un jour et une heure (14 jours ; trafic
  habituel à cette heure), **véhicule** (voiture, taxi, moto, électrique), **éviter** péages / autoroutes /
  ferries, **routes non bitumées** (interdire, éviter les longues, autoriser), **intersections difficiles**,
  et les **pass** du pays affiché (ZFE, zones piétonnes, vignettes…) — en tête et en gras ceux que le calcul
  dit concernés par le trajet. Tout changement relance le calcul. Mesures : [docs/options-calcul-livemap.md](docs/options-calcul-livemap.md).

## 0.07.00 — fiche du trajet et zones traversées

- Sous le résumé, la **fiche du trajet** comme l'appli la montre avant de partir : « Via … », péage
  (prix donné par le calcul, sans devise), puis les **zones traversées** (ZFE, Crit'Air, zones à permis) —
  en rouge celles que le trajet aurait dû éviter —, les permis exigés, « zone restreinte contournée »,
  « route non revêtue ».
- Sur la carte, les **portions du tracé situées dans une zone** sont en orange pointillé.

## 0.06.00 — phrases dans la langue de la voix

- Les annonces sont composées **dans la langue de la voix** (anglais, français, allemand, espagnol,
  italien, portugais du Brésil et du Portugal, néerlandais, hébreu), et non plus dans celle de
  l'interface. Voix automatique : celle de la langue de l'éditeur si le pays la propose, sinon la
  première du pays ; ou choisie dans l'onglet Scripts, pour entendre ce qu'entendent les conducteurs.
- Sources : anglais = les morceaux réels de la voix de l'appli (APK) ; consignes simples des autres
  langues = traductions officielles de Waze relevées dans l'éditeur ([docs/opcodes-wme-2026-09-25.json](docs/opcodes-wme-2026-09-25.json)) ;
  ronds-points, ordinaux, distances, « puis », arrivée hors anglais et français = **nos formules, non
  vérifiées sur l'appli** (son texte n'est pas embarqué).

## 0.05.00 — départ et arrivée par recherche

- Les champs Départ et Arrivée de la fenêtre sont des **zones de recherche** : adresse, rue, ville ou lieu
  Waze, avec le service de la barre « Rechercher » de WME (classé par proximité du centre de la carte).
  Flèches ↑ ↓, Entrée, Échap ; les touches ne partent pas vers les raccourcis de WME.
- Arrivée : l'épingle à damier de l'appli.

## 0.04.00 — une fenêtre, comme WCT, WNA et WPEU

- **Un bouton dans la colonne de droite de la carte** ouvre une fenêtre flottante : en-tête bleu à
  glisser (double-clic : retour à la place par défaut), poignée de redimensionnement, position et taille
  mémorisées. ⚠️ La fenêtre ne passe **jamais** sur la colonne de boutons ni sur le pied de page, ni en la
  déplaçant ni en l'agrandissant (bornes mesurées à chaque geste, comme WPEU).
- **Le bandeau de l'appli reste fixe en haut** ; seule la liste défile. La ligne choisie reste visible.
- **La liste « Étapes suivantes » de l'appli** : lignes alternées noir / #202124, icône, distance en blanc
  gras, rue ou panneau en bleu Waze, sans phrase (la phrase est en infobulle, les annonces en puces 🔊).
- **Ronds-points comme l'appli** : anneau numéroté à trois traînées qui s'estompent (sens de circulation),
  anneau gris et parcours blanc pour « à droite / tout droit / à gauche / demi-tour » — redessinés d'après
  les icônes « car_dark » de l'APK, mesurées.
- **Distances comme l'appli**, relevées sur ses captures : au mètre près sous 1 km (« 171 m »), puis
  « 3.9 km » (avec un point, même en français).
- La fenêtre s'ouvre d'elle-même dès qu'un trajet est calculé (réglable). L'onglet Scripts ne porte plus
  que l'aide et les réglages ; « Détail » dans le panneau ouvre la fenêtre.

## 0.03 — poser le départ et l'arrivée sans détour

0.03.00 : ligne TRAJET, calcul automatique, raccourcis · 0.03.01 : la ligne clignotait à côté de celle de
WME Jump to Node (les deux se disputaient la place sous l'en-tête) · 0.03.02 : drapeaux au lieu de A et B · 0.03.03 : bouton ✕ pour effacer le
trajet (panneau et onglet) ; on ne pouvait plus s'en défaire une fois calculé.

- **Départ et arrivée sont des drapeaux** (vert, à damier), dans le panneau, l'onglet et sur la carte :
  « A » et « B » faisaient doublon avec les nœuds A et B de WME et de WME Jump to Node.
- **Dans le panneau du segment ou du lieu sélectionné**, une ligne **TRAJET** (rangée sous celle de
  WME Jump to Node) : un clic sur un drapeau pose le départ ou l'arrivée sur la sélection, sans ouvrir
  l'onglet du script. Le drapeau est cerclé de bleu quand l'objet affiché est déjà ce point.
- **Le trajet se calcule tout seul** dès que les deux sont posés, et à chaque changement ; la même ligne
  affiche « Calcul… », puis la distance et la durée, et un bouton **Détail** qui ouvre l'onglet du script.
  Si deux calculs se croisent, seul le dernier demandé s'affiche.
- **Deux raccourcis clavier**, « départ sous le pointeur » et « arrivée sous le pointeur » : le
  point est pris sous la souris, sans rien sélectionner, et libellé par la rue du segment chargé le plus
  proche (à moins de 60 m). Ils sont déclarés **sans touches**, pour ne rien prendre à un autre script :
  les attribuer dans Paramètres › Raccourcis clavier.

## 0.02.00 — comme l'appli

Ce que le script montre et dit suit désormais l'appli Waze 5.24, lue dans son code
(analyse de l’APK, gardée hors du dépôt public) :

- **Bandeau de l'appli** pour l'instruction choisie : fond noir, icône de manœuvre, distance, ligne
  principale et ligne « en direction de » en bleu Waze, panneaux de sortie, pastille « puis » si la
  manœuvre suivante est à 200 m ou moins, **bande de voies** reconstruite depuis les voies posées dans WME
  (l'icône s'efface alors, comme dans l'appli).
- **Vrais cartouches** : images du serveur de rendu de Waze (`renderer-*.waze.com/renderer/v1/signs`),
  à partir du type et du texte posés dans WME ; sans instruction de virage, l'écusson de la rue remplace
  son nom selon la règle officielle (nom de 2 mots au plus contenant le numéro, jamais par une bretelle).
- **Annonces vocales planifiées** comme le fait l'appli : 1,5 km, 1 km et 800 m au-dessus de 70 km/h
  (vitesse prévue par l'itinéraire), 400 et 200 m, puis l'annonce au carrefour ; « puis … » si la
  manœuvre suivante est à 500 m ou moins. Chaque annonce s'écoute d'un clic ; **▶ Tout écouter** enchaîne
  la conduite, bandeau à la distance annoncée.
- Icônes de manœuvre dessinées (même vocabulaire que l'appli : « serrer » et « sortir » ont la même
  icône) ; distances arrondies à la dizaine supérieure (remplacé en 0.04 : au mètre, comme les captures de
  l'appli).

Limites propres à 0.02 (levées depuis : panneaux du serveur en 0.09, carrefours hors de la vue en 0.10) :
l'écusson d'une rue et les voies ne sont lus que sur les segments **chargés** dans WME ; la vitesse est celle
que prévoit l'itinéraire, pas celle du conducteur ; l'appli peut aussi recevoir ses annonces calculées par le
serveur (voie non visible dans l'APK).

## Premier jalon (0.01.00)

- **A et B** pris dans la sélection : un segment (son milieu) ou un lieu. Bouton ⇅ pour inverser.
- **Calculer** : trajet de la Live Map, tracé en bleu, manœuvres numérotées, résumé distance · durée.
- **Liste des instructions** : numéro, flèche (ou n° de sortie du rond-point), texte, distance depuis le
  départ, bouton 🔊. Un clic sur une ligne centre la carte sur le carrefour.
- **▶ Tout écouter** : enchaîne les manœuvres, carte centrée sur chacune.
- Interface et phrases : **français et anglais** pour ce jalon.

## Comment ça marche

- Itinéraire : `routing-livemap-{row|am|il}.waze.com/RoutingManager/routingRequest`, par
  `GM_xmlhttpRequest` (WME bloque l'appel direct).
- Voix : `W.app.descartesClient.convertTextToVoice(texte, {lon, lat}, '<voix>')` (la voix du pays ou celle
  choisie dans l'onglet : `fr-FR`, `de-DE`… — 0.06) — client interne de
  WME, qui rend l'adresse d'un MP3 servi par Waze.
- Rattachement mesuré sur une réponse réelle : l'instruction de `results[i]` s'exécute à la fin du
  tronçon i ; le carrefour est `results[i+1].path` (nœud d'entrée du tronçon suivant). Vérifié : 51/51
  nœuds, 10/10 virages du bon côté.

## Limites

- Le calcul porte sur la **carte publiée** : une modification ne se vérifie qu'après sa mise en ligne.
- La phrase est **recomposée** : l'application enchaîne des annonces enregistrées et la synthèse des
  noms, le phrasé exact peut différer.
- Les instructions personnalisées et les voies hors de la vue sont lues dans le service de données de WME
  (au plus 40 carrefours par trajet ; ceux qui n'ont pas pu être lus sont signalés dans la fiche).
- La voix passe par un appel **interne** de WME, pas par le SDK.

Le script ne modifie jamais la carte.

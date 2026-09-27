# Prépare le dépôt PUBLIC (GitHub) à partir de ce dépôt de travail, par LISTE BLANCHE.
#
#   python tools/publier.py        recopie les fichiers publics dans ../WME-Route-Preview-publication
#
# Le dépôt de travail garde tout (analyse de l'APK, audit, enregistrements de la voix, trajet personnel) et son
# historique en contient : il ne se pousse JAMAIS. Le dépôt public a son propre historique, qui ne reçoit que
# ce qui est listé ici. Un fichier nouveau n'est publié que si on l'ajoute à la liste.
import os, shutil, sys, glob

ICI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(os.path.dirname(ICI), 'WME-Route-Preview-publication')

FICHIERS = ['WME-Route-Preview.user.js', 'README.md', 'HISTORIQUE.md', 'LICENSE', 'icon.svg', 'ICON.png', 'icon-512.png', 'icon-256.png', 'icon-128.png', 'icon-64.png', '.gitattributes',
            'tools/check-idents.js', 'tools/rejouer-bancs.js', 'tools/banc-nouveautes.js', 'tools/publier.py',
            'docs/options-calcul-livemap.md', 'docs/opcodes-wme-2026-09-25.json', 'bancs/LISEZMOI.md']
BANCS = ['trajet_montpellier_lattes.json', 'trajet_rond-point_D26_Donzere.json', 'trajet_bollene_A7_sortie19.json',
         'trajet_bollene_A7_panneaux_serveur.json', 'trajet_milton_keynes_uk.json', 'trajet_uzes_nimes_alternatives.json']
for b in BANCS:
    FICHIERS += ['bancs/' + b, 'bancs/attendu/' + b]
# Les captures de la version en cours seulement (celles que le README affiche).
FICHIERS += [os.path.relpath(p, ICI).replace('\\', '/') for p in glob.glob(os.path.join(ICI, 'capture_*.jpg'))]

if not os.path.isdir(os.path.join(PUB, '.git')):
    sys.exit('dépôt de publication absent : ' + PUB)
# On vide ce que la liste ne contient plus (sauf .git), puis on recopie.
for racine, dossiers, fichiers in os.walk(PUB):
    if '.git' in dossiers:
        dossiers.remove('.git')
    for f in fichiers:
        rel = os.path.relpath(os.path.join(racine, f), PUB).replace('\\', '/')
        if rel not in FICHIERS:
            os.remove(os.path.join(racine, f))
            print('retiré  ' + rel)
for rel in FICHIERS:
    src, dst = os.path.join(ICI, rel), os.path.join(PUB, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)
print(str(len(FICHIERS)) + ' fichiers recopiés vers ' + PUB)

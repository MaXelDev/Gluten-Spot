# Gluten Spot

Une application gratuite, en français, pour vivre sans gluten au quotidien : scanner un produit, trouver où manger, cuisiner et suivre tes symptômes. Elle fonctionne sur téléphone et sur ordinateur, sans compte ni inscription.

**👉 [Ouvrir Gluten Spot](https://maxeldev.github.io/Gluten-Spot/)**

> **À savoir :** Gluten Spot aide à repérer les risques, mais peut se tromper. L'étiquette du produit fait foi, et l'application ne remplace pas un avis médical.

## Ce que tu peux faire

- **Vérifier un produit :** scanne un code-barres, cherche un produit ou colle une liste d'ingrédients. Tu peux aussi consulter le dictionnaire des ingrédients et les rappels officiels, et trouver des alternatives sans gluten.
- **Sortir :** trouve des adresses sur une carte et garde les tiennes avec tes notes. Montre au restaurant une carte qui explique ton régime, disponible en 15 langues.
- **Cuisiner :** 20 recettes, un planning de la semaine, une liste de courses avec alertes, des idées de remplacements et un calculateur de farine.
- **Suivre ta santé :** note tes repas et tes symptômes, repère des tendances et imprime un rapport pour ton médecin.

## Installer l'application

Ouvre le lien ci-dessus, puis :

- **iPhone (Safari) :** bouton Partager, puis « Sur l'écran d'accueil ».
- **Android (Chrome) :** menu ⋮, puis « Installer l'application ».
- **Ordinateur (Chrome ou Edge) :** icône d'installation dans la barre d'adresse.

L'installation est conseillée, surtout sur iPhone : sans elle, Safari peut effacer tes données après 7 jours sans visite.

Une fois l'application ouverte une première fois, la carte de restaurant, les recettes et ton journal fonctionnent aussi sans connexion. Le scan et la carte des adresses ont besoin d'internet.

## Tes données

Ton journal, tes favoris et tes listes restent **sur ton appareil**. Il n'y a ni compte ni serveur Gluten Spot : personne d'autre n'y a accès, pas même la personne qui publie l'application.

Quand tu utilises ces fonctions, seules ces informations sont envoyées aux services publics concernés :

| Fonction | Ce qui est envoyé | Service |
|---|---|---|
| Scan et recherche de produits | Le code-barres ou ta recherche | Open Food Facts |
| Rappels de produits | Le code-barres du produit consulté | RappelConso |
| Carte et adresses | La position ou le lieu choisi | OpenStreetMap |

## Ne perds pas tes données

Tes données n'existent nulle part ailleurs : si tu perds ton téléphone ou effaces les données de ton navigateur sans sauvegarde, elles sont perdues. L'application te le rappelle tous les 30 jours.

**Pour sauvegarder :** va dans **Réglages > Mes données**, puis garde le fichier dans ton Drive ou ton iCloud, ou envoie-le-toi par mail.

**Pour restaurer ou changer d'appareil :** ouvre l'application sur le nouvel appareil, puis choisis **Importer une sauvegarde** au même endroit.

- L'import ajoute le contenu du fichier à ce qui se trouve déjà sur l'appareil, sans rien écraser.
- Une entrée supprimée après la sauvegarde réapparaît si tu réimportes ce fichier.
- Tes appareils ne se synchronisent pas tout seuls.
- Le fichier n'est pas chiffré et contient ton journal de santé : ne le partage pas avec n'importe qui.

## Limites à connaître

- Les fiches produits viennent d'une base collaborative, parfois incomplète. En cas de doute, l'application n'affiche jamais « sans gluten ».
- Les rappels officiels ne concernent que la France.
- Les tendances du journal sont des pistes à discuter avec un professionnel de santé, pas un diagnostic.
- Les traductions des cartes de restaurant n'ont pas été relues par des professionnels.
- Les services publics utilisés sont gratuits et peuvent parfois être lents ou indisponibles.

## Sources et crédits

- Produits : [Open Food Facts](https://world.openfoodfacts.org) (ODbL)
- Rappels : [RappelConso](https://rappel.conso.gouv.fr)
- Lieux et fond de carte : [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL), avec Overpass et Nominatim
- Bibliothèques : Leaflet 1.9.4 (BSD-2-Clause), ZXing 0.23.0 (Apache-2.0), icônes Lucide (ISC), police Fraunces (OFL-1.1)

## Licence

Le code de Gluten Spot est sous [licence MIT](LICENSE). Les bibliothèques intégrées et les données ci-dessus gardent leurs propres licences.

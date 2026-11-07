// i : [quantité, unité, ingrédient]. Une quantité nulle n'est pas mise à l'échelle.
// a : allergènes présents, avec les identifiants du profil.
export const RECIPES = [
  {
    id: 'pancakes', t: 'Pancakes moelleux à la farine de riz', c: 'Petit-déjeuner', min: 20, p: 4, a: ['eggs', 'milk'],
    i: [[150, 'g', 'farine de riz'], [50, 'g', 'fécule de maïs'], [2, 'c. à café', 'levure chimique sans gluten'], [2, '', 'œufs'], [250, 'ml', 'lait'], [20, 'g', 'sucre'], [1, 'c. à soupe', 'huile']],
    s: ['Mélange la farine, la fécule, la levure et le sucre.', 'Ajoute les œufs, puis le lait petit à petit, et l’huile.', 'Laisse reposer 10 minutes.', 'Cuis des petites louches 2 minutes de chaque côté dans une poêle légèrement huilée.'],
  },
  {
    id: 'porridge', t: 'Porridge de quinoa à la banane', c: 'Petit-déjeuner', min: 15, p: 2, a: [],
    i: [[100, 'g', 'flocons de quinoa sans gluten'], [400, 'ml', 'boisson végétale ou lait'], [1, '', 'banane'], [1, 'c. à soupe', 'miel'], [0, 'pincée', 'cannelle']],
    s: ['Porte le lait à frémissement.', 'Ajoute les flocons et laisse cuire 5 minutes en remuant.', 'Écrase la moitié de la banane dans le porridge et ajoute la cannelle.', 'Sers avec le reste de banane et le miel.'],
  },
  {
    id: 'banana-bread', t: 'Banana bread à l’amande', c: 'Petit-déjeuner', min: 60, p: 8, a: ['eggs', 'nuts'],
    i: [[3, '', 'bananes bien mûres'], [2, '', 'œufs'], [60, 'ml', 'huile neutre'], [60, 'g', 'sucre'], [120, 'g', 'farine de riz'], [100, 'g', 'poudre d’amande'], [40, 'g', 'fécule de maïs'], [2, 'c. à café', 'levure chimique sans gluten']],
    s: ['Préchauffe le four à 170 °C.', 'Écrase les bananes, puis ajoute les œufs, l’huile et le sucre.', 'Incorpore les ingrédients secs.', 'Verse dans un moule à cake et fais cuire environ 45 minutes. Une lame doit ressortir propre.'],
  },
  {
    id: 'pain', t: 'Pain maison riz-sarrasin', c: 'Boulangerie', min: 120, p: 10, a: [],
    i: [[250, 'g', 'farine de riz'], [150, 'g', 'farine de sarrasin'], [100, 'g', 'fécule de pomme de terre'], [20, 'g', 'psyllium blond'], [7, 'g', 'levure boulangère sans gluten'], [8, 'g', 'sel'], [450, 'ml', 'eau tiède'], [30, 'ml', 'huile d’olive']],
    s: ['Mélange le psyllium avec l’eau tiède et l’huile, puis laisse gonfler 5 minutes.', 'Ajoute les farines, la fécule, la levure et le sel, puis pétris jusqu’à obtenir une pâte homogène.', 'Forme un pain, place-le dans un moule huilé et laisse lever 1 heure dans un endroit tiède.', 'Fais cuire 50 minutes à 210 °C, puis laisse refroidir complètement avant de couper.'],
  },
  {
    id: 'socca', t: 'Socca aux pois chiches', c: 'Boulangerie', min: 30, p: 4, a: [],
    i: [[250, 'g', 'farine de pois chiche'], [500, 'ml', 'eau'], [3, 'c. à soupe', 'huile d’olive'], [1, 'c. à café', 'sel'], [0, '', 'poivre']],
    s: ['Fouette la farine, l’eau, le sel et 2 cuillères d’huile. Laisse reposer 15 minutes.', 'Fais chauffer le four à 250 °C avec une plaque huilée à l’intérieur.', 'Verse une fine couche de pâte et fais cuire 12 minutes, jusqu’à ce que le dessus soit doré.', 'Poivre généreusement et sers chaud.'],
  },
  {
    id: 'galettes', t: 'Galettes de sarrasin complètes', c: 'Plat', min: 40, p: 4, a: ['eggs', 'milk'],
    i: [[250, 'g', 'farine de sarrasin sans gluten'], [500, 'ml', 'eau'], [1, 'c. à café', 'sel'], [4, '', 'œufs'], [4, 'tranches', 'jambon sans gluten'], [120, 'g', 'emmental en morceaux, à râper'], [20, 'g', 'beurre']],
    s: ['Mélange la farine, l’eau et le sel. Laisse reposer 1 heure si possible.', 'Beurre une grande poêle bien chaude et verses-y une louche de pâte.', 'Quand les bords se décollent, casse un œuf au centre et ajoute le jambon et le fromage.', 'Replie les bords et sers dès que le blanc est cuit.'],
  },
  {
    id: 'risotto', t: 'Risotto crémeux aux champignons', c: 'Plat', min: 35, p: 4, a: ['milk'],
    i: [[300, 'g', 'riz arborio'], [300, 'g', 'champignons'], [1, '', 'oignon'], [1, 'l', 'bouillon de légumes sans gluten'], [100, 'ml', 'vin blanc'], [60, 'g', 'parmesan en morceau, à râper'], [30, 'g', 'beurre']],
    s: ['Fais revenir les champignons, puis réserve-les.', 'Fais suer l’oignon émincé dans le beurre, ajoute le riz et remue 2 minutes.', 'Verse le vin, puis le bouillon chaud louche par louche pendant environ 18 minutes.', 'Ajoute les champignons et le parmesan, puis laisse reposer 2 minutes.'],
  },
  {
    id: 'poulet-coco', t: 'Poulet au curry et lait de coco', c: 'Plat', min: 30, p: 4, a: [],
    i: [[500, 'g', 'filets de poulet'], [400, 'ml', 'lait de coco'], [1, '', 'oignon'], [2, 'gousses', 'ail'], [2, 'c. à soupe', 'curry en poudre sans gluten'], [300, 'g', 'riz basmati'], [1, 'c. à soupe', 'huile']],
    s: ['Fais cuire le riz.', 'Fais dorer l’oignon, l’ail et le poulet coupé en morceaux dans l’huile.', 'Ajoute le curry, puis le lait de coco.', 'Laisse mijoter 15 minutes et sers avec le riz.'],
  },
  {
    id: 'dahl', t: 'Dahl de lentilles corail', c: 'Plat', min: 30, p: 4, a: [],
    i: [[300, 'g', 'lentilles corail'], [400, 'ml', 'lait de coco'], [400, 'g', 'tomates concassées'], [1, '', 'oignon'], [2, 'gousses', 'ail'], [1, 'c. à soupe', 'curcuma et cumin purs'], [500, 'ml', 'eau']],
    s: ['Rince soigneusement les lentilles.', 'Fais revenir l’oignon, l’ail et les épices.', 'Ajoute les lentilles, les tomates, le lait de coco et l’eau.', 'Laisse mijoter 20 minutes et sale à la fin.'],
  },
  {
    id: 'parmentier', t: 'Hachis parmentier', c: 'Plat', min: 60, p: 6, a: ['milk'],
    i: [[1.2, 'kg', 'pommes de terre'], [600, 'g', 'bœuf haché pur'], [2, '', 'oignons'], [200, 'ml', 'lait'], [50, 'g', 'beurre'], [80, 'g', 'emmental en morceau, à râper']],
    s: ['Fais cuire les pommes de terre et écrase-les avec le lait et le beurre.', 'Fais revenir les oignons et la viande. Sale et poivre.', 'Dépose la viande puis la purée dans un plat, et ajoute le fromage.', 'Enfourne 25 minutes à 200 °C.'],
  },
  {
    id: 'saumon-quinoa', t: 'Saumon au four et quinoa aux légumes', c: 'Plat', min: 30, p: 4, a: ['fish'],
    i: [[4, 'pavés', 'saumon'], [250, 'g', 'quinoa'], [2, '', 'courgettes'], [1, '', 'poivron'], [1, '', 'citron'], [2, 'c. à soupe', 'huile d’olive']],
    s: ['Rince le quinoa et fais-le cuire selon le paquet.', 'Fais revenir les légumes coupés en dés dans l’huile.', 'Enfourne le saumon 12 minutes à 200 °C, avec un filet de citron.', 'Mélange le quinoa et les légumes, puis sers avec le saumon.'],
  },
  {
    id: 'chili', t: 'Chili con carne', c: 'Plat', min: 50, p: 6, a: [],
    i: [[500, 'g', 'bœuf haché pur'], [800, 'g', 'tomates concassées'], [400, 'g', 'haricots rouges cuits'], [2, '', 'oignons'], [2, 'gousses', 'ail'], [2, 'c. à café', 'cumin et paprika purs'], [300, 'g', 'riz']],
    s: ['Fais revenir les oignons, l’ail et le bœuf.', 'Ajoute les épices et les tomates, puis laisse mijoter 25 minutes.', 'Ajoute les haricots égouttés et prolonge la cuisson de 10 minutes.', 'Sers avec le riz.'],
  },
  {
    id: 'nouilles', t: 'Nouilles de riz sautées aux crevettes', c: 'Plat', min: 25, p: 4, a: ['crustaceans', 'eggs', 'peanuts', 'soybeans'],
    i: [[300, 'g', 'nouilles de riz'], [300, 'g', 'crevettes décortiquées'], [2, '', 'œufs'], [3, 'c. à soupe', 'tamari sans gluten'], [1, '', 'citron vert'], [50, 'g', 'cacahuètes'], [150, 'g', 'pousses de soja']],
    s: ['Fais tremper les nouilles selon le paquet.', 'Fais sauter les crevettes, puis ajoute les œufs battus.', 'Ajoute les nouilles, les pousses de soja, le tamari et le jus de citron.', 'Parsème de cacahuètes concassées.'],
  },
  {
    id: 'salade-lentilles', t: 'Salade de lentilles et feta', c: 'Plat', min: 30, p: 4, a: ['milk', 'mustard'],
    i: [[250, 'g', 'lentilles vertes'], [150, 'g', 'feta'], [1, '', 'échalote'], [2, 'c. à soupe', 'vinaigre de vin'], [3, 'c. à soupe', 'huile d’olive'], [1, 'c. à café', 'moutarde sans gluten']],
    s: ['Rince les lentilles et fais-les cuire 20 à 25 minutes.', 'Prépare la vinaigrette avec la moutarde, le vinaigre et l’huile.', 'Mélange les lentilles tièdes, l’échalote et la vinaigrette.', 'Ajoute la feta émiettée.'],
  },
  {
    id: 'soupe-potiron', t: 'Velouté de potiron', c: 'Plat', min: 35, p: 4, a: ['milk'],
    i: [[1, 'kg', 'potiron'], [2, '', 'pommes de terre'], [1, '', 'oignon'], [750, 'ml', 'bouillon de légumes sans gluten'], [100, 'ml', 'crème'], [0, 'pincée', 'muscade']],
    s: ['Fais revenir l’oignon émincé.', 'Ajoute le potiron et les pommes de terre en cubes, puis le bouillon.', 'Laisse cuire 20 minutes et mixe.', 'Ajoute la crème et la muscade.'],
  },
  {
    id: 'quiche', t: 'Quiche sans pâte aux légumes', c: 'Plat', min: 45, p: 4, a: ['eggs', 'milk'],
    i: [[4, '', 'œufs'], [250, 'ml', 'crème'], [2, '', 'courgettes'], [150, 'g', 'lardons sans gluten'], [80, 'g', 'emmental en morceau, à râper']],
    s: ['Préchauffe le four à 180 °C.', 'Fais revenir les courgettes en dés et les lardons.', 'Bats les œufs et la crème, puis ajoute le fromage et la garniture.', 'Verse dans un moule beurré et fais cuire 30 minutes.'],
  },
  {
    id: 'bechamel', t: 'Béchamel à la fécule de maïs', c: 'Base', min: 10, p: 4, a: ['milk'],
    i: [[500, 'ml', 'lait'], [30, 'g', 'fécule de maïs'], [20, 'g', 'beurre'], [0, 'pincée', 'muscade']],
    s: ['Délaye la fécule dans un peu de lait froid.', 'Fais chauffer le reste du lait avec le beurre.', 'Ajoute la fécule délayée en fouettant, jusqu’à ce que la sauce épaississe.', 'Assaisonne avec du sel, du poivre et la muscade.'],
  },
  {
    id: 'fondant', t: 'Fondant au chocolat', c: 'Dessert', min: 35, p: 8, a: ['eggs', 'milk'],
    i: [[200, 'g', 'chocolat noir pâtissier sans gluten'], [150, 'g', 'beurre'], [4, '', 'œufs'], [100, 'g', 'sucre'], [30, 'g', 'fécule de maïs']],
    s: ['Préchauffe le four à 180 °C.', 'Fais fondre le chocolat et le beurre.', 'Fouette les œufs et le sucre, puis ajoute le chocolat et la fécule.', 'Verse dans un moule et fais cuire 20 minutes : le centre doit rester tremblant.'],
  },
  {
    id: 'cookies', t: 'Cookies à l’amande et au chocolat', c: 'Dessert', min: 25, p: 12, a: ['eggs', 'nuts'],
    i: [[200, 'g', 'poudre d’amande'], [80, 'g', 'sucre roux'], [1, '', 'œuf'], [80, 'g', 'pépites de chocolat sans gluten'], [0.5, 'c. à café', 'levure chimique sans gluten']],
    s: ['Préchauffe le four à 170 °C.', 'Mélange la poudre d’amande, le sucre et la levure, puis ajoute l’œuf et les pépites.', 'Forme de petits tas sur une plaque.', 'Fais cuire 12 minutes et laisse refroidir sur la plaque : ils durcissent en refroidissant.'],
  },
  {
    id: 'riz-lait', t: 'Riz au lait à la vanille', c: 'Dessert', min: 40, p: 4, a: ['milk'],
    i: [[120, 'g', 'riz rond'], [1, 'l', 'lait'], [60, 'g', 'sucre'], [1, 'gousse', 'vanille']],
    s: ['Fais chauffer le lait avec la vanille fendue.', 'Ajoute le riz et laisse cuire à feu doux 30 minutes, en remuant souvent.', 'Ajoute le sucre en fin de cuisson.', 'Sers tiède ou froid.'],
  },
];

export const RECIPE_CATEGORIES = ['Petit-déjeuner', 'Plat', 'Boulangerie', 'Dessert', 'Base'];

export const SUBSTITUTIONS = [
  { from: 'Farine de blé (gâteaux)', to: 'Mélange maison : 60 % farine de riz, 20 % fécule, 20 % poudre d’amande ou farine de sarrasin. Le calculateur ci-dessus donne les quantités.' },
  { from: 'Farine de blé (pain, pâte)', to: 'Mélange pour pain sans gluten, ou farines de riz et de sarrasin avec du psyllium (environ 4 % du poids des farines).' },
  { from: 'Farine pour lier une sauce', to: 'Fécule de maïs ou de pomme de terre : environ moitié moins, délayée à froid.' },
  { from: 'Chapelure', to: 'Polenta fine, poudre d’amande, flocons de sarrasin mixés ou chapelure sans gluten.' },
  { from: 'Pâtes', to: 'Pâtes de riz, de maïs, de lentilles ou de pois chiches indiquées sans gluten.' },
  { from: 'Semoule et couscous', to: 'Quinoa, semoule de maïs ou riz. Le millet convient s’il est sans gluten.' },
  { from: 'Sauce soja', to: 'Tamari ou aminos de coco indiqués sans gluten.' },
  { from: 'Bière (cuisine)', to: 'Bière sans gluten ou bouillon sans gluten.' },
  { from: 'Pain de mie', to: 'Pain sans gluten, ou galette de riz selon le plat.' },
  { from: 'Fond de tarte', to: 'Fond à base de farine de riz et de poudre d’amande, de pomme de terre râpée ou recette sans pâte.' },
];

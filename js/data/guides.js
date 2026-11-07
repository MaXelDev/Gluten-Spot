// Contenu général d'information. Il ne remplace pas l'avis d'un professionnel de santé.
export const GUIDES = [
  {
    id: 'demarrer', icon: 'lightbulb', t: 'Bien démarrer sans gluten', d: 'Les premières étapes, dans le bon ordre.',
    s: [
      { h: 'D’abord, le bon diagnostic', p: 'Si tu n’as pas encore été testé·e pour la maladie cœliaque, n’arrête pas le gluten avant d’en parler à ton médecin : les examens peuvent devenir faussement négatifs. Un diagnostic précis change le niveau de précaution et le suivi médical.' },
      { h: 'La première semaine', l: ['Repère les aliments naturellement sans gluten : riz, maïs, pommes de terre, légumineuses, viande, poisson, œufs, fruits et légumes.', 'Trie ton placard : mets de côté les produits contenant du blé, de l’orge, du seigle ou du malt.', 'Prends l’habitude de lire chaque étiquette, y compris celle des produits habituels : les recettes changent.', 'Préviens les personnes avec qui tu partages tes repas.'] },
      { h: 'Les premiers mois', l: ['Demande à un·e diététicien·ne de vérifier ton équilibre alimentaire.', 'Note ce que tu manges et tes symptômes : cela aide à repérer une contamination.', 'Les produits sans gluten industriels sont souvent pauvres en fibres : mise aussi sur les légumineuses, le sarrasin et le quinoa.', 'Une erreur peut arriver. Note-la, sans culpabiliser, puis identifie comment l’éviter.'] },
    ],
  },
  {
    id: 'etiquettes', icon: 'file-text', t: 'Lire une étiquette', d: 'Comprendre les mentions et les pièges.',
    s: [
      { h: 'Ce que dit la réglementation européenne', l: ['Les céréales contenant du gluten doivent être mises en évidence dans la liste d’ingrédients, souvent en gras.', '« Sans gluten » signifie au maximum 20 mg de gluten par kg.', '« Très faible teneur en gluten » signifie au maximum 100 mg par kg : cette mention ne suffit pas pour tout le monde.', 'L’épi de blé barré est un logo de certification : il donne une garantie supplémentaire.'] },
      { h: 'Les mentions à interpréter', l: ['« Peut contenir des traces de gluten » est une mention volontaire : son absence ne garantit pas l’absence de contamination.', '« Sans blé » ne signifie pas sans gluten : le produit peut contenir de l’orge ou du seigle.', 'Le « blé noir », lui, n’est pas du blé : c’est du sarrasin. Vérifie quand même les mélanges.', 'Le sirop de glucose, le dextrose et la maltodextrine de blé sont exemptés d’étiquetage allergène, car le raffinage élimine l’essentiel du gluten.'] },
      { h: 'Les bons réflexes', l: ['Relis l’étiquette à chaque achat, surtout après un changement d’emballage.', 'En cas de doute, contacte le service consommateur de la marque.', 'Hors de l’Union européenne, les règles diffèrent : ne te fie pas aux mêmes repères.'] },
    ],
  },
  {
    id: 'maison', icon: 'house', t: 'Éviter la contamination à la maison', d: 'Partager une cuisine sans risque.',
    s: [
      { h: 'Les zones sensibles', l: ['Grille-pain : prends-en un dédié ou utilise des sachets de cuisson.', 'Planches en bois et ustensiles rayés : garde-les uniquement pour le sans-gluten.', 'Passoire : réserves-en une, car ses trous retiennent les pâtes.', 'Beurre, confiture, pâte à tartiner : utilise des pots séparés pour éviter les miettes.', 'Farine : évite d’en utiliser à la maison, car elle reste en suspension dans l’air pendant des heures.'] },
      { h: 'Les habitudes qui protègent', l: ['Cuisine le sans-gluten en premier.', 'Nettoie le plan de travail et les ustensiles au savon avant de commencer.', 'Range les produits sans gluten en hauteur, à l’abri des miettes, dans des boîtes étiquetées.', 'Utilise une eau et une huile de cuisson propres, jamais déjà utilisées pour un aliment contenant du gluten.', 'Lave-toi les mains après avoir touché du pain ou de la farine.'] },
    ],
  },
  {
    id: 'exterieur', icon: 'utensils', t: 'Manger à l’extérieur', d: 'Préparer ses sorties sans stress.',
    s: [
      { h: 'Avant de partir', l: ['Appelle en dehors des heures de service pour poser tes questions.', 'Prépare ta carte de restaurant dans l’onglet Sorties.', 'Emporte une collation au cas où.'] },
      { h: 'Sur place', l: ['Explique que c’est une question de santé, et pas une préférence.', 'Pose les questions de la checklist et demande à parler au cuisinier si besoin.', 'Si une réponse te semble hésitante, choisis un plat simple ou renonce.', 'Si des croûtons ont été retirés de ton plat, demande qu’il soit refait.'] },
      { h: 'Invité·e chez des proches', l: ['Préviens à l’avance et partage le guide pour l’entourage.', 'Propose d’apporter un plat que tu pourras manger.', 'Mange un petit quelque chose avant si tu n’es pas sûr·e du repas.'] },
    ],
  },
  {
    id: 'voyage', icon: 'globe', t: 'Voyager sans gluten', d: 'Anticiper le trajet et la destination.',
    s: [
      { h: 'Préparation', l: ['Enregistre la carte de restaurant dans la langue du pays, et apprends les mots clés.', 'Repère à l’avance des adresses avec la carte de l’application.', 'Privilégie un logement avec cuisine.', 'Signale ton régime à la compagnie aérienne au moins 48 heures à l’avance.', 'Emporte des en-cas et un mot de ton médecin si tu transportes beaucoup de nourriture.'] },
      { h: 'Sur place', l: ['Renseigne-toi sur la législation locale : « sans gluten » ne garantit pas toujours les mêmes seuils.', 'Sois attentif·ve à la sauce soja dans de nombreux plats asiatiques.', 'Le pharmacien peut souvent t’indiquer où trouver des produits adaptés.'] },
    ],
  },
  {
    id: 'proches', icon: 'users', t: 'Guide pour l’entourage', d: 'À partager avec ta famille et tes amis.', shareable: true,
    s: [
      { h: 'Ce qu’il faut savoir', p: 'Le gluten se trouve dans le blé, le seigle, l’orge et leurs dérivés. Ce n’est ni un caprice ni un effet de mode : même de petites quantités peuvent rendre malade.' },
      { h: 'Cuisiner pour moi', l: ['Propose des plats simples : viande ou poisson nature, légumes, riz ou pommes de terre.', 'Vérifie chaque étiquette, en particulier les bouillons, sauces, épices et charcuteries.', 'Lave bien plan de travail, poêles et ustensiles avant de commencer.', 'N’utilise pas la même eau de cuisson, le même grille-pain ou la même huile que pour les aliments avec gluten.', 'Garde les emballages : je pourrai vérifier les ingrédients.'] },
      { h: 'À table', l: ['Sers mon plat en premier, avec des couverts dédiés.', 'Garde le pain à distance de mon assiette.', 'Retirer des croûtons ou des pâtes d’un plat ne suffit pas à le rendre sûr.', 'Si tu n’es pas sûr·e d’un ingrédient, dis-le-moi : ce n’est pas grave, et je préfère le savoir.'] },
    ],
  },
  {
    id: 'aides', icon: 'info', t: 'Aides et ressources en France', d: 'Remboursement, association et accompagnement.',
    s: [
      { h: 'Maladie cœliaque', l: ['L’Assurance Maladie prévoit une prise en charge partielle de certains produits sans gluten, pour les personnes avec un diagnostic confirmé et une prescription. Demande les conditions et les démarches à ton médecin ou à ta caisse.', 'Conserve les vignettes ou justificatifs demandés.', 'Un suivi médical régulier reste recommandé.'] },
      { h: 'Se faire accompagner', l: ['L’AFDIAG, l’Association française des intolérants au gluten, propose informations et entraide (afdiag.fr).', 'Un·e diététicien·ne peut t’aider à trouver une alimentation équilibrée.', 'À l’école, parle à l’établissement d’un Projet d’accueil individualisé (PAI) pour un enfant.'] },
      { h: 'Quand consulter rapidement', l: ['Tes symptômes persistent malgré le régime sans gluten.', 'Tu perds du poids sans explication ou tu as du sang dans les selles.', 'Tu te sens très fatigué·e ou tu présentes des signes de carence.'] },
    ],
  },
];

export const TIPS = [
  'Le « blé noir » n’est pas du blé : c’est du sarrasin, naturellement sans gluten.',
  'Une passoire retient facilement des restes de pâtes : garde-en une pour le sans-gluten.',
  '« Sans blé » ne veut pas dire « sans gluten » : le produit peut contenir de l’orge ou du seigle.',
  'Les frites sont souvent cuites dans la même friteuse que les produits panés : demande avant de commander.',
  'L’épeautre et le kamut sont des variétés de blé : ils contiennent du gluten.',
  'Relis l’étiquette de tes produits habituels : les recettes peuvent changer.',
  'Un plat dont on a retiré les croûtons reste contaminé : demande qu’il soit refait.',
  'La farine peut rester en suspension dans l’air pendant des heures : évite d’en utiliser à la maison.',
  'Les médicaments peuvent contenir des excipients à base de blé : demande à ton pharmacien.',
  'Le malt, même dans des céréales au maïs, contient du gluten sauf mention contraire.',
  'Le mélange « 60 % riz, 20 % fécule, 20 % amande » remplace bien la farine dans les gâteaux.',
  'Un grille-pain partagé est une source fréquente de contamination : utilise-en un dédié.',
  'Les bouillons en cube peuvent contenir du blé ou du malt : vérifie l’étiquette.',
  'Le sirop de glucose de blé est exempté d’étiquetage allergène dans l’UE : le raffinage élimine l’essentiel du gluten.',
];

export const SYMPTOMS = [
  'Ballonnements', 'Douleurs abdominales', 'Diarrhée', 'Constipation', 'Nausées', 'Fatigue',
  'Maux de tête', 'Brouillard mental', 'Douleurs articulaires', 'Éruption cutanée', 'Aphtes', 'Autre',
];

export const ALLERGIES = [
  { id: 'milk', label: 'Lait' }, { id: 'eggs', label: 'Œufs' }, { id: 'nuts', label: 'Fruits à coque' },
  { id: 'peanuts', label: 'Arachides' }, { id: 'soybeans', label: 'Soja' }, { id: 'fish', label: 'Poisson' },
  { id: 'crustaceans', label: 'Crustacés' }, { id: 'molluscs', label: 'Mollusques' }, { id: 'sesame-seeds', label: 'Sésame' },
  { id: 'mustard', label: 'Moutarde' }, { id: 'celery', label: 'Céleri' }, { id: 'lupin', label: 'Lupin' },
  { id: 'sulphur-dioxide-and-sulphites', label: 'Sulfites' },
];

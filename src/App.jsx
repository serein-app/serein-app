import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import { supabase } from "./supabaseClient";
import {
  Calendar as CalendarIcon,
  Wallet,
  Target,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Palette,
  Users,
  GraduationCap,
  Baby,
  Heart,
  User,
  HeartHandshake,
  Coins,
  DollarSign,
  Lightbulb,
  PiggyBank,
  Pencil,
  Languages,
  CreditCard,
  Download,
  Printer,
  ShieldCheck,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ---------------------------------------------------------------------------
// Thèmes
// ---------------------------------------------------------------------------
const THEMES = {
  mono: {
    name: "Noir & Gris",
    primary: "#1F2937",
    secondary: "#4B5563",
    accent: "#6B7280",
    soft: "#F3F4F6",
    text: "#111827",
    danger: "#B91C1C",
  },
  serein: {
    name: "Serein",
    primary: "#5BC2B4",
    secondary: "#A78BFA",
    accent: "#FFB69B",
    soft: "#E6F4F1",
    text: "#1E293B",
    danger: "#E0765A",
  },
  ambre: {
    name: "Ambre",
    primary: "#8A4B12",
    secondary: "#C97A2B",
    accent: "#2E6F6A",
    soft: "#FBF1E6",
    text: "#4A2C0A",
    danger: "#A63A2E",
  },
  ametiste: {
    name: "Améthyste",
    primary: "#4B2E6F",
    secondary: "#7A4FA0",
    accent: "#D99A3B",
    soft: "#F3EEF8",
    text: "#2E1B47",
    danger: "#B0446B",
  },
  foret: {
    name: "Forêt",
    primary: "#294B29",
    secondary: "#4C7A4C",
    accent: "#C96E4E",
    soft: "#EEF3E9",
    text: "#1D331D",
    danger: "#A64A3A",
  },
};

// Thèmes proposés dans le sélecteur (4 + Personnalisé). "mono" reste défini pour l'apparence
// par défaut avant que l'utilisateur choisisse une couleur, mais n'est plus proposé comme choix
// permanent — pour ne pas surcharger l'écran de sélection.
const PRESET_THEME_IDS = ["serein", "ambre", "ametiste", "foret"];

// --- Thème personnalisé : dérive une palette complète à partir d'une seule couleur choisie ---
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function deriveThemeFromColor(hex) {
  const { h, s } = hexToHsl(hex || "#0B5D62");
  return {
    name: "Personnalisé",
    primary: hex || "#0B5D62",
    secondary: hslToHex(h, Math.max(s - 10, 15), 52),
    accent: hslToHex((h + 35) % 360, Math.min(s + 5, 70), 55),
    soft: hslToHex(h, Math.min(s, 35), 95),
    text: hslToHex(h, Math.min(s + 10, 60), 18),
    danger: hslToHex(6, 65, 45),
  };
}
// Thème personnalisé complet : jusqu'à 3 couleurs choisies indépendamment (principale,
// secondaire, accent) — celles non choisies restent calculées automatiquement à partir
// de la couleur principale, pour rester cohérentes par défaut.
function customThemeFor(state) {
  const base = deriveThemeFromColor(state.customColor);
  return {
    ...base,
    secondary: state.customSecondary || base.secondary,
    accent: state.customAccent || base.accent,
  };
}
function themeFor(state) {
  return state.themeId === "custom" ? customThemeFor(state) : THEMES[state.themeId] || THEMES.mono;
}

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MOIS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function monthsFor(lang) {
  return lang === "en" ? MOIS_EN : MOIS_FR;
}
const JOURS_SEMAINE_FR = ["L", "M", "M", "J", "V", "S", "D"];
const JOURS_SEMAINE_EN = ["M", "T", "W", "T", "F", "S", "S"];
function weekdaysFor(lang) {
  return lang === "en" ? JOURS_SEMAINE_EN : JOURS_SEMAINE_FR;
}
const TERMES = [
  { id: "court", label: "Court terme", hint: "< 1 an" },
  { id: "moyen", label: "Moyen terme", hint: "1 à 3 ans" },
  { id: "long", label: "Long terme", hint: "> 3 ans" },
];
const TERM_KEY = { court: "termShort", moyen: "termMedium", long: "termLong" };

const PROFILE_ICONS = { etudiant: GraduationCap, parent: Baby, couple: Heart, celibataire: User, aidant: HeartHandshake, autre: Users };
const PROFILE_IDS = ["etudiant", "parent", "couple", "celibataire", "aidant", "autre"];

const CURRENCIES = [
  { code: "EUR", label: "Euro (€)" },
  { code: "CAD", label: "Dollar canadien (CA$)" },
  { code: "USD", label: "Dollar américain (US$)" },
  { code: "GBP", label: "Livre sterling (£)" },
  { code: "CHF", label: "Franc suisse (CHF)" },
  { code: "JPY", label: "Yen japonais (¥)" },
  { code: "AUD", label: "Dollar australien (A$)" },
  { code: "CNY", label: "Yuan chinois (¥)" },
  { code: "INR", label: "Roupie indienne (₹)" },
  { code: "BRL", label: "Real brésilien (R$)" },
  { code: "MXN", label: "Peso mexicain (MX$)" },
  { code: "MAD", label: "Dirham marocain (MAD)" },
  { code: "XOF", label: "Franc CFA - UEMOA (XOF)" },
  { code: "XAF", label: "Franc CFA - CEMAC (XAF)" },
  { code: "SEK", label: "Couronne suédoise (SEK)" },
  { code: "NOK", label: "Couronne norvégienne (NOK)" },
  { code: "NZD", label: "Dollar néo-zélandais (NZ$)" },
  { code: "SGD", label: "Dollar de Singapour (S$)" },
  { code: "AED", label: "Dirham des Émirats (AED)" },
  { code: "ZAR", label: "Rand sud-africain (ZAR)" },
];

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

// ---------------------------------------------------------------------------
// Traductions — dictionnaire fr/en + fonction t()
// ---------------------------------------------------------------------------
const TRANSLATIONS = {
  fr: {
    appName: "Serein",
    splashTagline: "Serein",
    welcomeTitle: "Bienvenue",
    welcomeBody: "Tes finances, enfin sous contrôle.",
    languageTitle: "Ta langue",
    benefit1Title: "Vois venir tes paiements",
    benefit1Text: "Un calendrier qui te montre tes paies, factures et abonnements avant qu'ils arrivent — plus de mauvaise surprise en fin de mois.",
    benefit2Title: "Rembourse tes dettes avec un vrai plan",
    benefit2Text: "Chaque dette a une vraie date de fin et un rythme calculé — pas juste un solde qui traîne sans qu'on sache quand ça se termine.",
    benefit3Title: "Adaptée à ta situation",
    benefit3Text: "Étudiant, couple, parent, aidant proche… contrairement à la plupart des autres apps, Serein s'adapte à toi et sait qui doit quoi à qui.",
    skipBenefits: "Passer l'introduction",
    languageHint: "Modifiable à tout moment dans les réglages.",
    signupTitle: "Créer ton compte",
    signupHint: "Pour que tes données te suivent d'un appareil à l'autre.",
    signupDemoNote: "Aperçu de l'écran d'inscription — dans cette version de démonstration, rien n'est réellement créé ni sauvegardé.",
    signupGoogle: "Continuer avec Google",
    signupOr: "ou avec ton e-mail",
    signupEmail: "E-mail",
    signupPassword: "Mot de passe",
    prenomTitle: "Comment tu t'appelles ?",
    prenomHint: "Ça permet de personnaliser un peu l'appli, juste pour toi.",
    prenomLabel: "Prénom",
    situationTitle: "Ta situation",
    situationHint: "Ça nous permet d'adapter les questions suivantes.",
    profile_etudiant: "Étudiant",
    profile_parent: "Parent",
    profile_couple: "Couple",
    profile_celibataire: "Célibataire",
    profile_aidant: "Aidant proche",
    profile_autre: "Autre",
    currencyTitle: "Ta devise",
    currencyHint: "Utilisée pour tous les montants de l'application. Modifiable à tout moment dans les réglages.",
    currencyLabel: "Devise",
    themeTitle: "Choisis ton thème",
    themeHint: "Tu pourras en changer à tout moment dans les réglages.",
    themeCustom: "Personnalisé",
    themeCustomHint: "Choisis ta couleur — le reste de la palette s'adapte automatiquement.",
    themeCustomHintPrimary: "Couleur principale — boutons, éléments actifs.",
    themeCustomHintSecondary: "Couleur secondaire — calculée automatiquement, modifiable.",
    themeCustomHintAccent: "Couleur d'accent — calculée automatiquement, modifiable.",
    resetToAuto: "Réinitialiser",
    customIconPlaceholder: "Ton emoji",
    addHint: "Ce bouton enregistre cette entrée et vide le formulaire pour que tu puisses en ajouter une autre juste après, si besoin.",
    householdTitle: "Votre foyer",
    householdHint: "Indique qui fait partie du couple — ça permettra ensuite d'attribuer chaque dette, projet ou revenu à la bonne personne, ou de dire que c'est commun. Le revenu de chacun se saisit un peu plus loin.",
    householdName1: "Nom (personne 1)",
    householdName2: "Nom (personne 2)",
    householdIncome: "Revenu net par versement",
    householdIncomeOptional: "optionnel",
    householdReceivedAs: "Reçu de façon",
    parentsTitle: "Les parents",
    parentsHint: "Un parent solo, ou deux — indique qui gère les finances familiales. Ça permettra ensuite d'attribuer chaque dette, facture ou abonnement à la bonne personne, à un enfant, ou de dire que c'est commun.",
    parentsP1: "Parent 1",
    parentsP2: "Parent 2",
    parentsAdd2: "Ajouter un parent 2",
    parentsRemove2: "Retirer le parent 2",
    childrenTitle: "Vos enfants",
    childrenHint: "Au Canada, un REEE (régime enregistré d'épargne-études) est un compte d'épargne dédié aux enfants avec subventions gouvernementales — tu peux en créer un ici pour le suivre.",
    childrenAddBtn: "Ajouter cet enfant",
    childFirstName: "Prénom",
    childAgeOptional: "Âge — optionnel",
    childOpenAccount: "Ouvrir un compte pour cet enfant (REEE, etc.)",
    childAccountName: "Nom du compte",
    childAccountBalance: "Solde actuel",
    aidantTitle: "Les personnes que tu aides",
    aidantHint: "Ajoute chaque personne dont tu gères une partie des finances — ça permettra ensuite d'attribuer chaque dette, facture, abonnement ou projet à la bonne personne, ou de dire que c'est pour toi ou commun. Tu peux en ajouter plusieurs.",
    aidantAddBtn: "Ajouter cette personne",
    aidantFirstName: "Prénom",
    aidantRelation: "Lien avec toi",
    autreTitle: "Les personnes concernées",
    autreHint: "Si plusieurs personnes partagent tes finances (colocataires, famille élargie, autre configuration…), ajoute-les ici — ça permettra d'attribuer chaque dette, facture ou projet à la bonne personne. Sinon, passe simplement cette étape.",
    autreAddBtn: "Ajouter cette personne",
    autreFirstName: "Prénom",
    autreRole: "Rôle ou lien avec toi — optionnel",
    debtsTitle: "Tes dettes",
    debtsHint: "Titre, montant total, et comment tu la rembourses.",
    fieldTitle: "Titre",
    fieldDebtTotal: "Montant total de la dette",
    fieldDebtRemaining: "Montant qu'il reste à payer aujourd'hui — laisse vide si rien n'est encore remboursé",
    fieldInterestRate: "Taux d'intérêt annuel (%) — optionnel, ex : carte de crédit, hypothèque",
    fieldRepayment: "Remboursement",
    repaymentUnique: "Échéance unique",
    repaymentRecurrent: "Versements réguliers",
    fieldDueDateFull: "Date à laquelle payer en totalité",
    fieldDebtStart: "Date de début de la dette",
    fieldDebtEnd: "Date de fin prévue (dette remboursée en totalité)",
    fieldRepaymentFreq: "Fréquence des versements",
    debtStartHint: "Sert juste à fixer le jour du mois/de la semaine des versements sur le calendrier — laisse sur aujourd'hui si tu ne connais pas la date exacte, ça ne change rien au calcul du montant.",
    endDateModeQuestion: "Comment veux-tu indiquer la fin ?",
    endDateModeDate: "Une date précise",
    endDateModeDuration: "Juste une durée",
    durationMonthsLabel: "Dans combien de mois veux-tu avoir fini ?",
    interestRatePlaceholder: "Ex : 19.99 — laisse vide si tu ne le connais pas",
    fieldIcon: "Icône",
    aideTitle: "Aide & Conseils",
    aideSubtitle: "Des repères, pas des ordres — à toi de voir ce qui te convient.",
    aideDisclaimer: "Ceci n'est pas un conseil financier professionnel. Ce sont des calculs automatiques basés sur ce que tu as renseigné — ils ne remplacent pas l'avis d'un·e planificateur·rice financier·ère ou comptable agréé·e.",
    aideSavingsSpotted: "Économies repérées",
    aideCancelHint: "En annulant « {title} », tu libérerais ~{amount}/mois.",
    perMonth: "/mois",
    aideMethodsTitle: "Méthodes pour mettre de l'argent de côté",
    method502030Title: "Règle du 50/30/20",
    method502030Text: "50% du revenu pour les besoins essentiels (factures, dettes), 30% pour les envies (abonnements, loisirs), 20% pour l'épargne et les projets.",
    methodEnvelopesTitle: "Méthode des enveloppes",
    methodEnvelopesText: "Chaque dette et chaque projet a sa propre enveloppe avec un objectif précis — exactement ce que font les onglets Dettes et Projets de cette appli.",
    methodPayFirstTitle: "Se payer en premier",
    methodPayFirstText: "Dès l'arrivée d'une paie, virer d'abord le montant prévu pour l'épargne/les projets, avant de dépenser le reste — plutôt que d'épargner ce qu'il reste à la fin du mois.",
    aideNoIncome: "Ajoute au moins un revenu pour voir l'aperçu de cette méthode.",
    aidePreviewAllocation: "Aperçu — ta répartition actuelle",
    needsLabel: "Besoins (factures + dettes)",
    wantsLabel: "Envies (abonnements)",
    savingsLabel: "Épargne (projets)",
    overBudgetWarning: "Tes charges prévues ({total}/mois) dépassent tes revenus ({income}/mois).",
    aidePreviewEnvelopes: "Aperçu — l'avancement de chacune de tes enveloppes",
    aideNoDebtsProjects: "Aucune dette ni projet enregistré pour l'instant.",
    aidePreviewPayFirst: "Aperçu — si tu mets ton épargne de côté en premier",
    payFirstSetAside: "{amount}/mois mis de côté en premier",
    payFirstRest: "{amount}/mois pour le reste",
    payFirstExplain: "Concrètement : dès qu'une paie arrive, tu déplaces {saved} vers tes projets avant toute autre dépense. Le reste ({rest}) sert aux factures, dettes et envies du mois.",
    targetSuffix: "cible {pct}%",
    wellBalanced: "Bien équilibré",
    aboveTarget: "{n} pts au-dessus de la cible",
    belowTarget: "{n} pts en dessous de la cible",
    remainingWord: "restant",
    netWorthLabel: "Patrimoine net",
    assetsLabel: "Actifs",
    debtsLabelShort: "Dettes",
    upcomingDays: "Prochains jours",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    inNDays: "Dans {n} jours",
    debtTrendTitle: "Évolution de ta dette totale",
    debtTrendEmpty: "Ajoute un paiement pour commencer à voir ta dette totale évoluer dans le temps.",
    projectTrendTitle: "Évolution de ton épargne totale",
    projectTrendEmpty: "Ajoute un versement pour commencer à voir ton épargne évoluer dans le temps.",
    debtPaidOffTitle: "Dette remboursée ! 🎉",
    debtPaidOffMessage: "« {title} » est officiellement derrière toi — {amount} remboursés en totalité.",
    goalReachedTitle: "Objectif atteint ! 🎉",
    goalReachedMessage: "« {title} » est financé à 100 % — {amount} mis de côté. Tu peux passer à la suite.",
    continueBtn2: "Continuer",
    yourDataTitle: "Tes données",
    yourDataHint: "Tu peux repartir avec tes données à tout moment — aucune obligation de rester si tu changes d'avis.",
    exportCSV: "CSV",
    exportBackup: "Sauvegarde complète",
    exportPrint: "Imprimer / Enregistrer en PDF",
    comingSoonTitle: "À venir sur la vraie appli",
    comingSoonText: "Pas encore disponible, mais prévu : verrouillage par Face ID ou code à l'ouverture, et des rappels avant chaque échéance (facture, dette, abonnement) — pas seulement un affichage dans le calendrier.",
    privacyPolicy: "Politique de confidentialité",
    privacyPolicyBody: "Voici où en sont réellement tes données.\n\nCE QUE NOUS COLLECTONS\nUniquement ce que tu entres toi-même : prénom, dettes, projets, abonnements, factures, revenus, investissements, et la composition de ton foyer si tu la renseignes — plus ton adresse courriel pour la connexion.\n\nOÙ C'EST STOCKÉ\nTes données sont hébergées par Supabase, dans une base sécurisée, accessible uniquement par toi grâce à ton compte. La connexion se fait par lien envoyé à ton courriel, sans mot de passe à retenir.\n\nCE QUE NOUS NE FAISONS PAS\nNous ne vendons ni ne partageons tes données à des fins publicitaires. Aucune publicité dans l'application. Aucun suivi analytique caché.\n\nTES DROITS DÈS MAINTENANT\nTu peux exporter toutes tes données à tout moment (CSV, sauvegarde complète) juste au-dessus dans ces réglages, te déconnecter, ou réinitialiser complètement l'application.\n\nPOUR LA SUITE\nUne politique de confidentialité complète et conforme à la loi sera publiée séparément et remplacera ce résumé.",
    privacyPolicyClose: "Fermer",
    remainingToRepay: "Reste à rembourser",
    savedWord: "épargné",
    goalWord: "Objectif",
    freqMonthly: "Mensuel",
    freqWeekly: "Hebdomadaire",
    freqBiweekly: "Bi-hebdo",
    freqBimonthly: "Tous les 2 mois",
    freqYearly: "Annuel",
    concerns: "Concerne",
    common: "Commun",
    me: "Moi",
    saveChanges: "Enregistrer les modifications",
    add: "Ajouter",
    projectsTitle: "Tes projets",
    projectsHint: "Mariage, vacances, achat… courts, moyens ou longs termes.",
    fieldProjectAmount: "Somme à mettre de côté",
    fieldProjectStart: "Date de début du projet",
    fieldProjectEnd: "Date à laquelle tu veux avoir atteint la somme",
    fieldSavingFreq: "Fréquence de mise de côté",
    termLabel: "Terme",
    termSuggested: "Terme (suggéré selon les dates — modifiable)",
    termShort: "Court terme",
    termMedium: "Moyen terme",
    termLong: "Long terme",
    subscriptionsTitle: "Abonnements",
    subscriptionsHint: "Streaming, salle de sport, logiciels…",
    billsTitle: "Factures",
    billsHint: "Loyer, électricité, internet…",
    fieldAmount: "Montant",
    fieldFrequency: "Périodicité",
    fieldNextPaymentDate: "Date du prochain paiement",
    fieldPaymentDay: "Jour de paiement (1-31)",
    fieldMonth: "Mois",
    paydaysTitle: "Jours de paie",
    paydaysHint: "Quand l'argent arrive sur ton compte — que ce soit chaque semaine, toutes les deux semaines, ou une fois par mois.",
    fieldLabel: "Libellé",
    fieldNetAmount: "Montant net par paie",
    fieldNextPayday: "Date de ta prochaine paie",
    investmentsTitle: "Investissements",
    investmentsHint: "Optionnel — tu peux passer cette étape.",
    fieldInvestmentTitle: "Titre",
    fieldInvestmentType: "Type",
    fieldCurrentValue: "Valeur actuelle",
    investmentEditNote: "Pour changer la valeur, utilise « Mettre à jour » sur la carte de l'investissement — ça garde l'historique intact.",
    recapTitle: "C'est prêt",
    recapHint: "Voici ce que tu as renseigné. Tape sur une ligne pour y ajouter des éléments.",
    recapDebts: "Dettes",
    recapProjects: "Projets",
    recapSubscriptions: "Abonnements",
    recapBills: "Factures",
    recapPaydays: "Jours de paie",
    recapInvestments: "Investissements",
    recapChildren: "Enfants",
    recapAidant: "Personnes aidées",
    recapParents: "Parents",
    recapPeople: "Personnes",
    back: "Retour",
    continueBtn: "Continuer",
    backToRecap: "Revenir au résumé",
    letsGo: "C'est parti",
    skipRest: "Passer le reste et terminer plus tard — tu pourras tout ajouter depuis l'appli",
    tabCalendar: "Calendrier",
    tabDebts: "Dettes",
    tabProjects: "Projets",
    tabInvestments: "Invest.",
    tabAide: "Aide",
    settings: "Réglages",
    hello: "Bonjour",
    filterAll: "Tous",
    manageWhat: "Que veux-tu gérer ?",
    manageIncomeDesc: "Voir, ajouter ou modifier tes salaires et paies",
    manageBillsDesc: "Voir, ajouter ou modifier — électricité, loyer, internet…",
    manageSubsDesc: "Voir, ajouter ou modifier — streaming, salle de sport…",
    settingsIncome: "Revenus",
    settingsHousehold: "Votre foyer",
    settingsParents: "Parents",
    settingsChildren: "Enfants",
    settingsAidant: "Personnes aidées",
    settingsPeople: "Personnes",
    addIncome: "Ajouter un revenu",
    addChild: "Ajouter un enfant",
    addAidantPerson: "Ajouter une personne aidée",
    addPerson: "Ajouter une personne",
    editIncome: "Modifier le revenu",
    resetAllData: "Réinitialiser toutes les données",
    noIncome: "Aucun revenu enregistré.",
  },
  en: {
    appName: "Serein",
    splashTagline: "Serein",
    welcomeTitle: "Welcome",
    welcomeBody: "Your finances, finally under control.",
    languageTitle: "Your language",
    benefit1Title: "See your payments coming",
    benefit1Text: "A calendar that shows your paychecks, bills, and subscriptions before they hit — no more nasty surprises at month's end.",
    benefit2Title: "Pay off debt with a real plan",
    benefit2Text: "Every debt gets a real end date and a calculated pace — not just a balance that lingers with no sense of when it'll be done.",
    benefit3Title: "Adapted to your situation",
    benefit3Text: "Student, couple, parent, caregiver… unlike most other apps, Serein adapts to you and knows who owes what to whom.",
    skipBenefits: "Skip the intro",
    languageHint: "Changeable anytime in settings.",
    signupTitle: "Create your account",
    signupHint: "So your data follows you from device to device.",
    signupDemoNote: "Preview of the sign-up screen — in this demo version, nothing is actually created or saved.",
    signupGoogle: "Continue with Google",
    signupOr: "or with your email",
    signupEmail: "Email",
    signupPassword: "Password",
    prenomTitle: "What's your name?",
    prenomHint: "Just to personalize the app a little, for you.",
    prenomLabel: "First name",
    situationTitle: "Your situation",
    situationHint: "This lets us tailor the next questions.",
    profile_etudiant: "Student",
    profile_parent: "Parent",
    profile_couple: "Couple",
    profile_celibataire: "Single",
    profile_aidant: "Caregiver",
    profile_autre: "Other",
    currencyTitle: "Your currency",
    currencyHint: "Used for every amount in the app. Changeable anytime in settings.",
    currencyLabel: "Currency",
    themeTitle: "Pick your theme",
    themeHint: "You can change it anytime in settings.",
    themeCustom: "Custom",
    themeCustomHint: "Pick your color — the rest of the palette adjusts automatically.",
    themeCustomHintPrimary: "Main color — buttons, active elements.",
    themeCustomHintSecondary: "Secondary color — auto-calculated, editable.",
    themeCustomHintAccent: "Accent color — auto-calculated, editable.",
    resetToAuto: "Reset",
    customIconPlaceholder: "Your emoji",
    addHint: "This button saves this entry and clears the form so you can add another one right after, if needed.",
    householdTitle: "Your household",
    householdHint: "Tell us who's in the couple — this will let us attribute each debt, project, or income to the right person, or mark it as shared. Each person's income is entered a bit further along.",
    householdName1: "Name (person 1)",
    householdName2: "Name (person 2)",
    householdIncome: "Net income per pay",
    householdIncomeOptional: "optional",
    householdReceivedAs: "Received",
    parentsTitle: "The parents",
    parentsHint: "A single parent, or two — tell us who manages the family finances. This will let us attribute each debt, bill, or subscription to the right person, to a child, or mark it as shared.",
    parentsP1: "Parent 1",
    parentsP2: "Parent 2",
    parentsAdd2: "Add a second parent",
    parentsRemove2: "Remove second parent",
    childrenTitle: "Your children",
    childrenHint: "In Canada, an RESP (registered education savings plan) is a dedicated savings account for children with government grants — you can create one here to track it.",
    childrenAddBtn: "Add this child",
    childFirstName: "First name",
    childAgeOptional: "Age — optional",
    childOpenAccount: "Open an account for this child (RESP, etc.)",
    childAccountName: "Account name",
    childAccountBalance: "Current balance",
    aidantTitle: "The people you help",
    aidantHint: "Add each person whose finances you help manage — this will let us attribute each debt, bill, subscription, or project to the right person, or mark it as yours or shared. You can add several.",
    aidantAddBtn: "Add this person",
    aidantFirstName: "First name",
    aidantRelation: "Relation to you",
    autreTitle: "People involved",
    autreHint: "If several people share your finances (roommates, extended family, another setup…), add them here — this will let us attribute each debt, bill, or project to the right person. Otherwise, just skip this step.",
    autreAddBtn: "Add this person",
    autreFirstName: "First name",
    autreRole: "Role or relation to you — optional",
    debtsTitle: "Your debts",
    debtsHint: "Title, total amount, and how you're paying it off.",
    fieldTitle: "Title",
    fieldDebtTotal: "Total debt amount",
    fieldDebtRemaining: "Amount still owed today — leave blank if nothing has been repaid yet",
    fieldInterestRate: "Annual interest rate (%) — optional, e.g. credit card, mortgage",
    fieldRepayment: "Repayment",
    repaymentUnique: "One-time due date",
    repaymentRecurrent: "Regular payments",
    fieldDueDateFull: "Date to pay in full",
    fieldDebtStart: "Debt start date",
    fieldDebtEnd: "Expected end date (debt fully repaid)",
    fieldRepaymentFreq: "Payment frequency",
    debtStartHint: "This just sets which day of the month/week payments land on the calendar — leave it on today if you don't remember the exact date, it doesn't affect the amount calculation.",
    endDateModeQuestion: "How do you want to indicate the end?",
    endDateModeDate: "A specific date",
    endDateModeDuration: "Just a duration",
    durationMonthsLabel: "In how many months do you want to be done?",
    interestRatePlaceholder: "E.g. 19.99 — leave blank if you don't know it",
    fieldIcon: "Icon",
    aideTitle: "Help & Advice",
    aideSubtitle: "Guidelines, not orders — it's up to you to see what works for you.",
    aideDisclaimer: "This isn't professional financial advice. These are automatic calculations based on what you've entered — they don't replace the advice of a licensed financial planner or accountant.",
    aideSavingsSpotted: "Spotted savings",
    aideCancelHint: "Cancelling \u00ab {title} \u00bb would free up ~{amount}/month.",
    perMonth: "/month",
    aideMethodsTitle: "Ways to set money aside",
    method502030Title: "The 50/30/20 rule",
    method502030Text: "50% of income for essential needs (bills, debts), 30% for wants (subscriptions, leisure), 20% for savings and projects.",
    methodEnvelopesTitle: "Envelope method",
    methodEnvelopesText: "Each debt and each project has its own envelope with a precise goal — exactly what the Debts and Projects tabs in this app already do.",
    methodPayFirstTitle: "Pay yourself first",
    methodPayFirstText: "As soon as a paycheck arrives, move the planned amount to savings/projects first, before spending the rest — rather than saving whatever's left at the end of the month.",
    aideNoIncome: "Add at least one income source to see a preview of this method.",
    aidePreviewAllocation: "Preview — your current breakdown",
    needsLabel: "Needs (bills + debts)",
    wantsLabel: "Wants (subscriptions)",
    savingsLabel: "Savings (projects)",
    overBudgetWarning: "Your planned expenses ({total}/month) exceed your income ({income}/month).",
    aidePreviewEnvelopes: "Preview — progress on each of your envelopes",
    aideNoDebtsProjects: "No debt or project recorded yet.",
    aidePreviewPayFirst: "Preview — if you set your savings aside first",
    payFirstSetAside: "{amount}/month set aside first",
    payFirstRest: "{amount}/month for the rest",
    payFirstExplain: "In practice: as soon as a paycheck arrives, you move {saved} to your projects before any other spending. The rest ({rest}) covers this month's bills, debts, and wants.",
    targetSuffix: "target {pct}%",
    wellBalanced: "Well balanced",
    aboveTarget: "{n} pts above target",
    belowTarget: "{n} pts below target",
    remainingWord: "remaining",
    netWorthLabel: "Net worth",
    assetsLabel: "Assets",
    debtsLabelShort: "Debts",
    upcomingDays: "Upcoming days",
    today: "Today",
    tomorrow: "Tomorrow",
    inNDays: "In {n} days",
    debtTrendTitle: "Your total debt over time",
    debtTrendEmpty: "Add a payment to start seeing your total debt change over time.",
    projectTrendTitle: "Your total savings over time",
    projectTrendEmpty: "Add a contribution to start seeing your savings change over time.",
    debtPaidOffTitle: "Debt paid off! 🎉",
    debtPaidOffMessage: "\u00ab {title} \u00bb is officially behind you — {amount} fully repaid.",
    goalReachedTitle: "Goal reached! 🎉",
    goalReachedMessage: "\u00ab {title} \u00bb is 100% funded — {amount} saved. You can move on to the next thing.",
    continueBtn2: "Continue",
    yourDataTitle: "Your data",
    yourDataHint: "You can take your data with you at any time — no obligation to stay if you change your mind.",
    exportCSV: "CSV",
    exportBackup: "Full backup",
    exportPrint: "Print / Save as PDF",
    comingSoonTitle: "Coming to the real app",
    comingSoonText: "Not available yet, but planned: Face ID or passcode lock on opening, and reminders before each due date (bill, debt, subscription) — not just a passive display in the calendar.",
    privacyPolicy: "Privacy Policy",
    privacyPolicyBody: "Here's where your data actually stands.\n\nWHAT WE COLLECT\nOnly what you enter yourself: first name, debts, projects, subscriptions, bills, income, investments, and your household composition if you fill it in — plus your email for sign-in.\n\nWHERE IT'S STORED\nYour data is hosted by Supabase, in a secure database, accessible only by you through your account. Sign-in happens via a link sent to your email, no password to remember.\n\nWHAT WE DON'T DO\nWe never sell or share your data for advertising purposes. No ads in the app. No hidden analytics tracking.\n\nYOUR RIGHTS RIGHT NOW\nYou can export all your data at any time (CSV, full backup) just above in these settings, sign out, or fully reset the app.\n\nWHAT'S NEXT\nA complete, legally compliant privacy policy will be published separately and will replace this summary.",
    privacyPolicyClose: "Close",
    remainingToRepay: "Remaining to repay",
    savedWord: "saved",
    goalWord: "Goal",
    freqMonthly: "Monthly",
    freqWeekly: "Weekly",
    freqBiweekly: "Bi-weekly",
    freqBimonthly: "Every 2 months",
    freqYearly: "Yearly",
    concerns: "Applies to",
    common: "Shared",
    me: "Me",
    saveChanges: "Save changes",
    add: "Add",
    projectsTitle: "Your projects",
    projectsHint: "Wedding, vacation, purchase… short, medium, or long term.",
    fieldProjectAmount: "Amount to save",
    fieldProjectStart: "Project start date",
    fieldProjectEnd: "Date you want to reach the amount by",
    fieldSavingFreq: "Saving frequency",
    termLabel: "Term",
    termSuggested: "Term (suggested from dates — editable)",
    termShort: "Short term",
    termMedium: "Medium term",
    termLong: "Long term",
    subscriptionsTitle: "Subscriptions",
    subscriptionsHint: "Streaming, gym, software…",
    billsTitle: "Bills",
    billsHint: "Rent, electricity, internet…",
    fieldAmount: "Amount",
    fieldFrequency: "Frequency",
    fieldNextPaymentDate: "Next payment date",
    fieldPaymentDay: "Payment day (1-31)",
    fieldMonth: "Month",
    paydaysTitle: "Paydays",
    paydaysHint: "When money arrives in your account — weekly, every two weeks, or once a month.",
    fieldLabel: "Label",
    fieldNetAmount: "Net amount per pay",
    fieldNextPayday: "Your next payday",
    investmentsTitle: "Investments",
    investmentsHint: "Optional — you can skip this step.",
    fieldInvestmentTitle: "Title",
    fieldInvestmentType: "Type",
    fieldCurrentValue: "Current value",
    investmentEditNote: "To change the value, use \"Update\" on the investment's card — that keeps the history intact.",
    recapTitle: "All set",
    recapHint: "Here's what you've entered. Tap a row to add more to it.",
    recapDebts: "Debts",
    recapProjects: "Projects",
    recapSubscriptions: "Subscriptions",
    recapBills: "Bills",
    recapPaydays: "Paydays",
    recapInvestments: "Investments",
    recapChildren: "Children",
    recapAidant: "People helped",
    recapParents: "Parents",
    recapPeople: "People",
    back: "Back",
    continueBtn: "Continue",
    backToRecap: "Back to summary",
    letsGo: "Let's go",
    skipRest: "Skip the rest and finish later — you'll be able to add everything from the app",
    tabCalendar: "Calendar",
    tabDebts: "Debts",
    tabProjects: "Projects",
    tabInvestments: "Invest.",
    tabAide: "Help",
    settings: "Settings",
    hello: "Hello",
    filterAll: "All",
    manageWhat: "What do you want to manage?",
    manageIncomeDesc: "View, add, or edit your salaries and paychecks",
    manageBillsDesc: "View, add, or edit — electricity, rent, internet…",
    manageSubsDesc: "View, add, or edit — streaming, gym…",
    settingsIncome: "Income",
    settingsHousehold: "Your household",
    settingsParents: "Parents",
    settingsChildren: "Children",
    settingsAidant: "People helped",
    settingsPeople: "People",
    addIncome: "Add income",
    addChild: "Add a child",
    addAidantPerson: "Add a person you help",
    addPerson: "Add a person",
    editIncome: "Edit income",
    resetAllData: "Reset all data",
    noIncome: "No income recorded yet.",
  },
};

function t(lang, key) {
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.fr[key] || key;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const today = new Date().toISOString().slice(0, 10);

// Logo Serein — icône calendrier/enveloppe validée
const LOGO_SEREIN = "data:image/png;base64,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";


const defaultState = {
  onboardingDone: false,
  userName: "",
  language: "fr",
  themeId: "serein",
  customColor: "#0B5D62",
  customSecondary: null,
  customAccent: null,
  currency: "EUR",
  profileType: null,
  people: [],
  children: [],
  debts: [],
  projects: [],
  subscriptions: [],
  bills: [],
  paydays: [],
  investments: [],
  debtsHistory: [],
  projectsHistory: [],
};

// Ajoute (ou met à jour si même jour) un point d'historique — évite les doublons
// quand plusieurs actions ont lieu le même jour.
function pushHistoryPoint(history, total) {
  const hist = history || [];
  const last = hist[hist.length - 1];
  if (last && last.date === today) {
    return [...hist.slice(0, -1), { date: today, total }];
  }
  return [...hist, { date: today, total }];
}

// --- Export des données (CSV / JSON / impression) ---------------------------

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function csvSection(title, headers, rows) {
  const lines = [title, headers.join(",")];
  rows.forEach((r) => lines.push(r.map(csvEscape).join(",")));
  return lines.join("\n");
}

function buildFullCSV(state) {
  const sections = [];
  sections.push(csvSection("DETTES", ["Titre", "Montant total", "Payé", "Restant", "Taux d'intérêt (%)", "Mode", "Échéance / Fin", "Fréquence", "Concerne"],
    state.debts.map((d) => [d.title, d.amount, d.paid, d.amount - d.paid, d.interestRate ?? "", d.paymentMode, d.paymentMode === "unique" ? d.dueDate : d.endDate, d.frequency || "", ownerLabel(d.owner, state)])
  ));
  sections.push(csvSection("PROJETS", ["Titre", "Objectif", "Épargné", "Terme", "Date de fin", "Fréquence", "Concerne"],
    state.projects.map((p) => [p.title, p.target, p.saved, p.term, p.endDate, p.frequency, ownerLabel(p.owner, state)])
  ));
  sections.push(csvSection("ABONNEMENTS", ["Titre", "Montant", "Périodicité", "Jour/Date", "Concerne"],
    state.subscriptions.map((s) => [s.title, s.amount, s.period, s.startDate || s.day, ownerLabel(s.owner, state)])
  ));
  sections.push(csvSection("FACTURES", ["Titre", "Montant", "Périodicité", "Jour/Date", "Concerne"],
    state.bills.map((b) => [b.title, b.amount, b.period, b.startDate || b.day, ownerLabel(b.owner, state)])
  ));
  sections.push(csvSection("REVENUS", ["Libellé", "Montant", "Fréquence", "Date", "Concerne"],
    state.paydays.map((p) => [p.title, p.amount, p.frequency, p.startDate, ownerLabel(p.owner, state)])
  ));
  sections.push(csvSection("INVESTISSEMENTS", ["Titre", "Type", "Valeur", "Concerne"],
    state.investments.map((i) => [i.title, i.type, i.value, ownerLabel(i.owner, state)])
  ));
  return sections.join("\n\n");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAsCSV(state) {
  downloadFile(`serein-export-${today}.csv`, "\uFEFF" + buildFullCSV(state), "text/csv;charset=utf-8;");
}

function exportAsJSON(state) {
  downloadFile(`serein-sauvegarde-${today}.json`, JSON.stringify(state, null, 2), "application/json");
}

function printSummary(state) {
  const w = window.open("", "_blank");
  if (!w) return;
  const rows = (title, items) => items.map((r) => `<tr>${r.map((c) => `<td style="padding:4px 8px;border-bottom:1px solid #eee;">${c ?? ""}</td>`).join("")}</tr>`).join("");
  w.document.write(`
    <html><head><title>Résumé Serein — ${today}</title>
    <style>body{font-family:sans-serif;padding:24px;color:#1E293B;} h2{margin-top:28px;border-bottom:2px solid #333;padding-bottom:4px;} table{border-collapse:collapse;width:100%;font-size:13px;}</style>
    </head><body>
    <h1>Résumé Serein — ${today}</h1>
    <h2>Dettes</h2><table>${rows("d", state.debts.map((d) => [d.title, money(d.amount - d.paid, state.currency) + " restant", ownerLabel(d.owner, state)]))}</table>
    <h2>Projets</h2><table>${rows("p", state.projects.map((p) => [p.title, `${money(p.saved, state.currency)} / ${money(p.target, state.currency)}`, ownerLabel(p.owner, state)]))}</table>
    <h2>Abonnements</h2><table>${rows("s", state.subscriptions.map((s) => [s.title, money(s.amount, state.currency), s.period]))}</table>
    <h2>Factures</h2><table>${rows("b", state.bills.map((b) => [b.title, money(b.amount, state.currency), b.period]))}</table>
    <h2>Investissements</h2><table>${rows("i", state.investments.map((i) => [i.title, i.type, money(i.value, state.currency)]))}</table>
    <script>window.onload = () => window.print();</script>
    </body></html>
  `);
  w.document.close();
}

// Langue courante pour le formatage des montants — mise à jour à chaque rendu de l'app
// (évite de faire passer `lang` en argument à chacun des 100+ appels de money() dans le fichier)
let CURRENT_MONEY_LOCALE = "fr-FR";
function setMoneyLocale(lang) {
  CURRENT_MONEY_LOCALE = lang === "en" ? "en-US" : "fr-FR";
}

function money(amount, currency) {
  try {
    return (Number(amount) || 0).toLocaleString(CURRENT_MONEY_LOCALE, { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 });
  } catch {
    return `${Number(amount) || 0} ${currency || ""}`;
  }
}

// Nombre de mois entre deux dates (AAAA-MM-JJ), minimum 1
function monthsBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + "T00:00:00");
  const d2 = new Date(dateStr2 + "T00:00:00");
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + (d2.getDate() >= d1.getDate() ? 0 : -1);
  return Math.max(1, months);
}

// Suggère un terme (court/moyen/long) à partir de la durée entre deux dates
function suggestTerm(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const months = monthsBetween(startDate, endDate);
  if (months < 12) return "court";
  if (months <= 36) return "moyen";
  return "long";
}

// Convertit une durée en mois (depuis aujourd'hui) en date de fin — pour les cas où on connaît
// juste "dans combien de temps" plutôt qu'une date précise.
function addMonthsFromToday(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().slice(0, 10);
}

// Convertit un montant périodique en équivalent mensuel
function monthlyEquivalent(amount, frequency) {
  if (frequency === "hebdomadaire") return amount * 4.33;
  if (frequency === "bi-hebdomadaire") return amount * 2.17;
  if (frequency === "bimestriel") return amount / 2;
  if (frequency === "annuel") return amount / 12;
  return amount;
}

// Versement estimé pour une dette à versements réguliers, basé sur le solde restant et la date de fin prévue
// Nombre de versements par mois selon la fréquence (approximatif pour hebdo/bi-hebdo)
function periodsPerMonth(frequency) {
  if (frequency === "hebdomadaire") return 4;
  if (frequency === "bi-hebdomadaire") return 2.17;
  return 1;
}
function freqLabel(frequency) {
  if (frequency === "hebdomadaire") return "semaine";
  if (frequency === "bi-hebdomadaire") return "2 semaines";
  return "mois";
}

// Taux d'intérêt périodique (par versement) à partir d'un taux annuel et d'une fréquence
function periodicRate(annualRatePct, frequency) {
  const periodsPerYear = periodsPerMonth(frequency) * 12;
  return (annualRatePct / 100) / periodsPerYear;
}

// Versement "intérêts seulement" : en dessous de ce montant, le capital ne diminue pas (ou augmente)
function interestOnlyPayment(remaining, annualRatePct, frequency) {
  if (!annualRatePct) return 0;
  return remaining * periodicRate(annualRatePct, frequency);
}

// Calcule un vrai versement amorti (capital + intérêts) si un taux est renseigné,
// sinon une simple division du capital restant sur le nombre de versements.
function amortizedInstallment(remaining, annualRatePct, periods, frequency) {
  if (!annualRatePct || annualRatePct <= 0 || periods <= 0) return Math.ceil(remaining / Math.max(1, periods));
  const r = periodicRate(annualRatePct, frequency);
  const denom = 1 - Math.pow(1 + r, -periods);
  if (denom <= 0) return Math.ceil(remaining / periods);
  return Math.ceil((remaining * r) / denom);
}

function debtInstallment(d) {
  if (d.paymentMode !== "recurrent" || !d.endDate) return 0;
  const remaining = Math.max(0, d.amount - d.paid);
  const monthsLeft = monthsBetween(today, d.endDate);
  const periods = monthsLeft * periodsPerMonth(d.frequency);
  return amortizedInstallment(remaining, d.interestRate, periods, d.frequency);
}
function projectInstallment(p) {
  if (!p.endDate) return 0;
  const remaining = Math.max(0, p.target - p.saved);
  const monthsLeft = monthsBetween(today, p.endDate);
  return Math.ceil(remaining / (monthsLeft * periodsPerMonth(p.frequency)));
}

// Retourne les jours du mois (year/month, month = 0-11) où une occurrence tombe
function occurrencesInMonth(startDateStr, frequency, year, month) {
  if (!startDateStr) return [];
  const start = new Date(startDateStr + "T00:00:00");
  const monthStart = new Date(year, month, 1);
  const daysInThisMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = new Date(year, month, daysInThisMonth, 23, 59, 59);
  if (start > monthEnd) return [];

  if (frequency === "mensuel") {
    if (monthStart < new Date(start.getFullYear(), start.getMonth(), 1)) return [];
    return [Math.min(start.getDate(), daysInThisMonth)];
  }

  if (frequency === "bimestriel") {
    const startIdx = start.getFullYear() * 12 + start.getMonth();
    const thisIdx = year * 12 + month;
    if (thisIdx < startIdx || (thisIdx - startIdx) % 2 !== 0) return [];
    return [Math.min(start.getDate(), daysInThisMonth)];
  }

  const stepDays = frequency === "bi-hebdomadaire" ? 14 : 7;
  const days = [];
  let cursor = new Date(start);
  if (cursor < monthStart) {
    const diffDays = Math.floor((monthStart - cursor) / 86400000);
    const steps = Math.floor(diffDays / stepDays);
    cursor = new Date(cursor.getTime() + steps * stepDays * 86400000);
    while (cursor < monthStart) cursor = new Date(cursor.getTime() + stepDays * 86400000);
  }
  while (cursor <= monthEnd) {
    days.push(cursor.getDate());
    cursor = new Date(cursor.getTime() + stepDays * 86400000);
  }
  return days;
}

const HAS_OWNERS = ["couple", "aidant", "parent", "autre"];
const OWNER_PALETTE = ["#7C3AED", "#0EA5E9", "#C2732A", "#2E9E5B", "#D97706", "#8B5CF6"];

// Liste des options d'attribution selon le profil : couple = 2 personnes fixes + Commun ;
// aidant proche / autre = "Moi" + chaque personne ajoutée (nombre variable) + Commun ;
// parent = Parent(s) + chaque enfant + Commun.
function ownerOptions(state) {
  const lang = state.language || "fr";
  if (state.profileType === "couple") {
    return [...state.people, { id: "commun", label: t(lang, "common") }];
  }
  if (state.profileType === "aidant" || state.profileType === "autre") {
    return [{ id: "moi", label: t(lang, "me") }, ...state.people.map((p) => ({ id: p.id, label: p.label })), { id: "commun", label: t(lang, "common") }];
  }
  if (state.profileType === "parent") {
    return [
      ...state.people.map((p) => ({ id: p.id, label: p.label })),
      ...state.children.map((c) => ({ id: `child-${c.id}`, label: c.name })),
      { id: "commun", label: t(lang, "common") },
    ];
  }
  return [];
}

function ownerLabel(ownerId, state) {
  const lang = state.language || "fr";
  if (!ownerId || ownerId === "commun") return t(lang, "common");
  if (ownerId === "moi") return t(lang, "me");
  if (typeof ownerId === "string" && ownerId.startsWith("child-")) {
    const c = state.children.find((x) => x.id === ownerId.slice(6));
    return c ? c.name : t(lang, "common");
  }
  const p = state.people.find((x) => x.id === ownerId);
  return p ? p.label : t(lang, "common");
}

function ownerColor(ownerId, state) {
  if (!ownerId || ownerId === "commun") return "#5B6B73";
  if (ownerId === "p1" || ownerId === "moi") return "#2E6F9E";
  if (ownerId === "p2") return "#B0446B";
  if (typeof ownerId === "string" && ownerId.startsWith("child-")) {
    const idx = state.children.findIndex((c) => c.id === ownerId.slice(6));
    return idx >= 0 ? OWNER_PALETTE[idx % OWNER_PALETTE.length] : "#5B6B73";
  }
  const idx = state.people.findIndex((p) => p.id === ownerId);
  return idx >= 0 ? OWNER_PALETTE[idx % OWNER_PALETTE.length] : "#5B6B73";
}

function OwnerBadge({ ownerId, state }) {
  if (!HAS_OWNERS.includes(state.profileType)) return null;
  const label = ownerLabel(ownerId, state);
  const color = ownerColor(ownerId, state);
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Petits composants UI
// ---------------------------------------------------------------------------
function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1 text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-11 rounded-lg border border-slate-300 bg-white text-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1";

// Pour les champs "à choisir" (select, date) : couleur légèrement différente du texte libre,
// mais bien visible et interactive — pour ne jamais donner une impression de champ désactivé.
// Hauteur fixe (comme inputCls) pour que les champs date/select ne s'affichent pas plus grands
// que les autres à cause du rendu natif du navigateur.
const selectCls =
  "w-full h-11 rounded-lg border border-slate-300 bg-sky-50 text-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1";

// iOS ignore parfois la hauteur CSS classique sur <input type="date"> : on la force en style inline
// (priorité maximale) en plus de la règle globale ci-dessous, en dernier recours.
const dateInputStyle = { height: "44px", lineHeight: "20px", WebkitAppearance: "none", appearance: "none" };

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

      * {
        font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif !important;
      }

      input[type="date"] {
        -webkit-appearance: none;
        appearance: none;
        height: 44px !important;
        line-height: 20px !important;
        font-size: 14px !important;
        box-sizing: border-box !important;
      }
      input[type="date"]::-webkit-date-and-time-value {
        text-align: left;
        height: 20px;
      }

      @keyframes celebratePop {
        0% { transform: scale(0.85); opacity: 0; }
        60% { transform: scale(1.03); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes celebrateRing {
        0% { transform: scale(0.6); opacity: 0.6; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    `}</style>
  );
}

function ProgressBar({ value, color }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// Bouton supprimer en deux temps : premier tap = demande confirmation, deuxième tap = supprime.
// Évite qu'un clic malheureux fasse perdre une progression, sans avoir besoin d'une fenêtre à part.
function ConfirmDeleteButton({ onConfirm, size = 15 }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={() => { onConfirm(); setConfirming(false); }}
          className="text-[10px] font-medium px-2 py-1 rounded bg-red-500 text-white whitespace-nowrap"
        >
          Supprimer ?
        </button>
        <button onClick={() => setConfirming(false)} className="text-[10px] text-slate-400 px-1.5 py-1">
          Annuler
        </button>
      </span>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="text-slate-300 hover:text-red-500 p-1">
      <Trash2 size={size} />
    </button>
  );
}

function OwnerSelect({ theme, state, value, onChange }) {
  if (!HAS_OWNERS.includes(state.profileType)) return null;
  const options = ownerOptions(state);
  return (
    <Field label={t(state.language || "fr", "concerns")}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => onChange(o.id)}
            className="rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: value === o.id ? theme.primary : "#e2e8f0",
              backgroundColor: value === o.id ? theme.soft : "white",
              color: value === o.id ? theme.text : "#64748b",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function OwnerFilterBar({ theme, state, value, onChange }) {
  if (!HAS_OWNERS.includes(state.profileType)) return null;
  const lang = state.language || "fr";
  const options = [{ id: "all", label: t(lang, "filterAll") }, { id: "commun", label: t(lang, "common") }, ...ownerOptions(state).filter((o) => o.id !== "commun")];
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap"
          style={{
            backgroundColor: value === opt.id ? theme.primary : "white",
            color: value === opt.id ? "white" : "#64748b",
            border: `1px solid ${value === opt.id ? theme.primary : "#e2e8f0"}`,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function BottomSheet({ title, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 overflow-y-auto overscroll-contain"
      style={{ WebkitOverflowScrolling: "touch" }}
      onClick={onClose}
    >
      <div className="min-h-full flex items-end">
        <div className="bg-white w-full rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <h2 className="font-semibold">{title}</h2>
            <button onClick={onClose}><X size={18} /></button>
          </div>
          <div className="p-5 pb-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Fenêtre "Gérer" générique : liste les éléments existants (avec modifier/supprimer),
// et bascule vers le formulaire d'ajout/modification en interne — utilisée pour les
// abonnements, factures et revenus, accessibles depuis le "+" du Calendrier.
// Écran de célébration — apparaît au moment précis où une dette passe à zéro ou un
// objectif d'épargne est atteint. Sobre et chaleureux, pas de confettis criards.
function CelebrationOverlay({ theme, icon, title, message, onClose, lang }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-6" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
        style={{ animation: "celebratePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: theme.primary, animation: "celebrateRing 1.6s ease-out infinite" }}
          />
          <span className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ backgroundColor: theme.soft }}>
            {icon}
          </span>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>{title}</h2>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="w-full text-sm font-medium text-white px-4 py-2.5 rounded-lg"
          style={{ backgroundColor: theme.primary }}
        >
          {t(lang, "continueBtn2")}
        </button>
      </div>
    </div>
  );
}

function ManageListSheet({ sheetTitle, theme, state, setState, field, StepComp, stepExtraProps, renderRow, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const items = state[field];

  const addItem = (item) => {
    setState((s) => ({ ...s, [field]: [...s[field], { id: uid(), ...item }] }));
    setShowForm(false);
  };
  const saveItem = (id, fields) => {
    setState((s) => ({ ...s, [field]: s[field].map((x) => (x.id === id ? { ...x, ...fields } : x)) }));
    setShowForm(false);
    setEditing(null);
  };
  const removeItem = (id) => setState((s) => ({ ...s, [field]: s[field].filter((x) => x.id !== id) }));

  const visibleItems = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) => x.title.toLowerCase().includes(q));
    }
    if (sortBy === "az") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "amount") list = [...list].sort((a, b) => b.amount - a.amount);
    return list;
  }, [items, search, sortBy]);

  return (
    <BottomSheet title={sheetTitle} onClose={onClose}>
      {!showForm && (
        <>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="mb-3 flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg text-white"
            style={{ backgroundColor: theme.primary }}
          >
            <Plus size={16} /> Ajouter
          </button>
          {items.length > 3 && (
            <div className="mb-3 space-y-2">
              <input
                className={inputCls}
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex gap-2">
                {[{ id: "recent", label: "Récent" }, { id: "az", label: "A-Z" }, { id: "amount", label: "Montant" }].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSortBy(o.id)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: sortBy === o.id ? theme.primary : "white",
                      color: sortBy === o.id ? "white" : "#64748b",
                      border: `1px solid ${sortBy === o.id ? theme.primary : "#e2e8f0"}`,
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">Rien pour l'instant.</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun résultat pour « {search} ».</p>
          ) : (
            <ul className="space-y-2">
              {visibleItems.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">{renderRow(x)}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditing(x); setShowForm(true); }} className="text-slate-400 hover:text-slate-700 p-1"><Pencil size={14} /></button>
                    <ConfirmDeleteButton onConfirm={() => removeItem(x.id)} size={14} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {showForm && (
        <div>
          <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-xs mb-3" style={{ color: theme.primary }}>
            ← Retour à la liste
          </button>
          <StepComp
            theme={theme}
            state={state}
            items={items}
            editItem={editing}
            onAdd={addItem}
            onSave={saveItem}
            onRemove={removeItem}
            hideList
            {...stepExtraProps}
          />
        </div>
      )}
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Écran d'ouverture
// ---------------------------------------------------------------------------
function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#E6F4F1" }}>
      <GlobalStyles />
      <div
        className="w-20 h-20 rounded-2xl overflow-hidden animate-pulse"
        style={{ backgroundColor: "#5BC2B4" }}
      >
        <img src={LOGO_SEREIN} alt="Serein" className="w-full h-full object-cover" />
      </div>
      <span className="text-sm font-semibold tracking-wide" style={{ color: "#1E293B" }}>SEREIN</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
function Onboarding({ state, setState, onFinish }) {
  const [step, setStep] = useState(0);
  const theme = themeFor(state);
  const lang = state.language || "fr";

  const steps = useMemo(() => {
    const s = ["welcome", "benefit1", "benefit2", "benefit3", "language", "prenom", "theme", "situation"];
    if (state.profileType === "autre") s.push("autre-people");
    s.push("currency");
    if (state.profileType === "couple") s.push("household");
    if (state.profileType === "parent") s.push("parents", "children");
    if (state.profileType === "aidant") s.push("aidant");
    s.push("debts", "projects", "subscriptions", "bills", "paydays", "investments", "recap");
    return s;
  }, [state.profileType]);

  useEffect(() => {
    if (step > steps.length - 1) setStep(steps.length - 1);
  }, [steps, step]);

  const total = steps.length;
  const current = steps[step];

  // Refs vers les étapes "ajout dans une liste" : permet d'enregistrer automatiquement
  // ce qui est en cours de saisie quand on clique sur Continuer / Retour, sans avoir
  // à cliquer sur "Ajouter" en plus.
  const debtsRef = useRef(null);
  const projectsRef = useRef(null);
  const subsRef = useRef(null);
  const billsRef = useRef(null);
  const paydaysRef = useRef(null);
  const investRef = useRef(null);
  const childrenRef = useRef(null);
  const aidantRef = useRef(null);
  const autrePeopleRef = useRef(null);
  const stepRefs = {
    debts: debtsRef,
    projects: projectsRef,
    subscriptions: subsRef,
    bills: billsRef,
    paydays: paydaysRef,
    investments: investRef,
    children: childrenRef,
    aidant: aidantRef,
    "autre-people": autrePeopleRef,
  };

  const commitCurrentStep = () => {
    const r = stepRefs[current];
    if (r && r.current && r.current.commit) r.current.commit();
  };

  const [returnToRecap, setReturnToRecap] = useState(false);

  const next = () => {
    commitCurrentStep();
    if (returnToRecap) {
      setReturnToRecap(false);
      setStep(steps.indexOf("recap"));
    } else {
      setStep((s) => Math.min(s + 1, total - 1));
    }
  };
  const back = () => {
    commitCurrentStep();
    setStep((s) => Math.max(s - 1, 0));
  };

  const editFromRecap = (stepId) => {
    const idx = steps.indexOf(stepId);
    if (idx >= 0) {
      setReturnToRecap(true);
      setStep(idx);
    }
  };

  const addTo = (key, item) =>
    setState((s) => ({ ...s, [key]: [...s[key], { id: uid(), ...item }] }));
  const removeFrom = (key, id) =>
    setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));

  const canContinue = current === "situation" ? !!state.profileType : true;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.soft }}>
      <GlobalStyles />
      <div className="h-1.5 bg-slate-200">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((step + 1) / total) * 100}%`, backgroundColor: theme.primary }}
        />
      </div>
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
          {current === "welcome" && <WelcomeStep theme={theme} lang={lang} />}
          {current === "benefit1" && <BenefitStep theme={theme} icon={CalendarIcon} title={t(lang, "benefit1Title")} text={t(lang, "benefit1Text")} />}
          {current === "benefit2" && <BenefitStep theme={theme} icon={Target} title={t(lang, "benefit2Title")} text={t(lang, "benefit2Text")} />}
          {current === "benefit3" && <BenefitStep theme={theme} icon={Users} title={t(lang, "benefit3Title")} text={t(lang, "benefit3Text")} />}
          {current === "language" && (
            <LanguageStep theme={theme} value={lang} onPick={(code) => setState((s) => ({ ...s, language: code }))} />
          )}
          {current === "prenom" && <PrenomStep value={state.userName} onChange={(v) => setState((s) => ({ ...s, userName: v }))} lang={lang} />}
          {current === "situation" && (
            <SituationStep
              theme={theme}
              lang={lang}
              value={state.profileType}
              onPick={(id) =>
                setState((s) => ({
                  ...s,
                  profileType: id,
                  people:
                    id === "couple" && s.people.length === 0
                      ? [
                          { id: "p1", label: s.userName || "Personne 1", revenu: "", revenuFrequency: "mensuel" },
                          { id: "p2", label: "Personne 2", revenu: "", revenuFrequency: "mensuel" },
                        ]
                      : id === "parent" && s.people.length === 0
                      ? [{ id: "p1", label: s.userName || "Parent 1" }]
                      : s.people,
                }))
              }
            />
          )}
          {current === "autre-people" && (
            <AutreStep
              ref={autrePeopleRef}
              theme={theme}
              state={state}
              items={state.people}
              onAdd={(i) => addTo("people", i)}
              onRemove={(id) => removeFrom("people", id)}
            />
          )}
          {current === "currency" && (
            <CurrencyStep value={state.currency} onPick={(id) => setState((s) => ({ ...s, currency: id }))} lang={lang} />
          )}
          {current === "household" && (
            <HouseholdStep
              theme={theme}
              state={state}
              people={state.people}
              onChange={(people) => setState((s) => ({ ...s, people }))}
            />
          )}
          {current === "parents" && (
            <ParentsStep
              theme={theme}
              state={state}
              people={state.people}
              onChange={(people) => setState((s) => ({ ...s, people }))}
            />
          )}
          {current === "children" && (
            <ChildrenStep
              ref={childrenRef}
              theme={theme}
              state={state}
              items={state.children}
              onAdd={(i) => addTo("children", i)}
              onRemove={(id) => removeFrom("children", id)}
            />
          )}
          {current === "aidant" && (
            <AidantStep
              ref={aidantRef}
              theme={theme}
              state={state}
              items={state.people}
              onAdd={(i) => addTo("people", i)}
              onRemove={(id) => removeFrom("people", id)}
            />
          )}
          {current === "theme" && (
            <ThemeStep
              themeId={state.themeId}
              onPick={(id) => setState((s) => ({ ...s, themeId: id }))}
              customColor={state.customColor}
              customSecondary={state.customSecondary}
              customAccent={state.customAccent}
              onChangeCustom={(field, value) => setState((s) => ({ ...s, [field]: value }))}
              lang={lang}
            />
          )}
          {current === "debts" && (
            <DebtsStep ref={debtsRef} theme={theme} state={state} items={state.debts} onAdd={(i) => addTo("debts", i)} onRemove={(id) => removeFrom("debts", id)} />
          )}
          {current === "projects" && (
            <ProjectsStep ref={projectsRef} theme={theme} state={state} items={state.projects} onAdd={(i) => addTo("projects", i)} onRemove={(id) => removeFrom("projects", id)} />
          )}
          {current === "subscriptions" && (
            <RecurringStep
              ref={subsRef}
              theme={theme}
              state={state}
              title={t(lang, "subscriptionsTitle")}
              hint={t(lang, "subscriptionsHint")}
              items={state.subscriptions}
              onAdd={(i) => addTo("subscriptions", i)}
              onRemove={(id) => removeFrom("subscriptions", id)}
            />
          )}
          {current === "bills" && (
            <RecurringStep
              ref={billsRef}
              theme={theme}
              state={state}
              title={t(lang, "billsTitle")}
              hint={t(lang, "billsHint")}
              items={state.bills}
              onAdd={(i) => addTo("bills", i)}
              onRemove={(id) => removeFrom("bills", id)}
            />
          )}
          {current === "paydays" && (
            <PaydaysStep ref={paydaysRef} theme={theme} state={state} items={state.paydays} onAdd={(i) => addTo("paydays", i)} onRemove={(id) => removeFrom("paydays", id)} />
          )}
          {current === "investments" && (
            <InvestmentsStep ref={investRef} theme={theme} state={state} items={state.investments} onAdd={(i) => addTo("investments", i)} onRemove={(id) => removeFrom("investments", id)} />
          )}
          {current === "recap" && <RecapStep theme={theme} state={state} onEdit={editFromRecap} />}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            {step > 0 ? (
              <button onClick={back} className="flex items-center gap-1 text-sm text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-50">
                <ArrowLeft size={16} /> {t(lang, "back")}
              </button>
            ) : <span />}
            {step < total - 1 ? (
              <button
                onClick={next}
                disabled={!canContinue}
                className="flex items-center gap-1 text-sm font-medium text-white px-4 py-2 rounded-lg disabled:opacity-40"
                style={{ backgroundColor: theme.primary }}
              >
                {returnToRecap ? t(lang, "backToRecap") : t(lang, "continueBtn")} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="flex items-center gap-1 text-sm font-medium text-white px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.accent }}
              >
                <Check size={16} /> {t(lang, "letsGo")}
              </button>
            )}
          </div>

          {["benefit1", "benefit2", "benefit3"].includes(current) && (
            <button
              onClick={() => setStep(steps.indexOf("language"))}
              className="w-full text-center text-xs text-slate-400 mt-3 underline"
            >
              {t(lang, "skipBenefits")}
            </button>
          )}

          {!returnToRecap && step > steps.indexOf("currency") && current !== "recap" && (
            <button
              onClick={() => { commitCurrentStep(); setReturnToRecap(false); setStep(steps.indexOf("recap")); }}
              className="w-full text-center text-xs text-slate-400 mt-3 underline"
            >
              {t(lang, "skipRest")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ theme, lang }) {
  return (
    <div>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: theme.soft }}>
        <Wallet color={theme.primary} size={24} />
      </div>
      <h1 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>{t(lang, "welcomeTitle")}</h1>
      <p className="text-sm text-slate-500 leading-relaxed">{t(lang, "welcomeBody")}</p>
    </div>
  );
}

function BenefitStep({ theme, icon: Icon, title, text }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ backgroundColor: theme.soft }}>
        <Icon color={theme.primary} size={30} />
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>{title}</h2>
      <p className="text-sm text-slate-500 leading-relaxed px-2">{text}</p>
    </div>
  );
}

function LanguageStep({ theme, value, onPick }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">{t(value, "languageTitle")}</h2>
      <p className="text-sm text-slate-500 mb-4">{t(value, "languageHint")}</p>
      <div className="grid grid-cols-2 gap-3">
        {LANGUAGES.map((l) => {
          const active = value === l.code;
          return (
            <button
              key={l.code}
              onClick={() => onPick(l.code)}
              className="rounded-xl p-4 text-center border-2"
              style={{
                borderColor: active ? theme.primary : "transparent",
                backgroundColor: active ? theme.soft : "#F8FAFC",
                color: active ? theme.text : "#334155",
              }}
            >
              <span className="text-sm font-medium">{l.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PrenomStep({ value, onChange, lang }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">{t(lang, "prenomTitle")}</h2>
      <p className="text-sm text-slate-500 mb-4">{t(lang, "prenomHint")}</p>
      <Field label={t(lang, "prenomLabel")}>
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ex : Léa" />
      </Field>
    </div>
  );
}

function SituationStep({ theme, value, onPick, lang }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">{t(lang, "situationTitle")}</h2>
      <p className="text-sm text-slate-500 mb-4">{t(lang, "situationHint")}</p>
      <div className="grid grid-cols-2 gap-3">
        {PROFILE_IDS.map((id) => {
          const Icon = PROFILE_ICONS[id];
          const active = value === id;
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className="rounded-xl p-3 flex flex-col items-start gap-2 border-2 text-left"
              style={{
                borderColor: active ? theme.primary : "transparent",
                backgroundColor: active ? theme.soft : "#F8FAFC",
              }}
            >
              <Icon size={18} color={active ? theme.primary : "#64748b"} />
              <span className="text-sm font-medium" style={{ color: active ? theme.text : "#334155" }}>{t(lang, `profile_${id}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CurrencyStep({ value, onPick, lang }) {
  return (
    <div>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-slate-50">
        <Coins size={22} className="text-slate-500" />
      </div>
      <h2 className="text-lg font-semibold mb-1">{t(lang, "currencyTitle")}</h2>
      <p className="text-sm text-slate-500 mb-4">{t(lang, "currencyHint")}</p>
      <Field label={t(lang, "currencyLabel")}>
        <select className={selectCls} value={value} onChange={(e) => onPick(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </Field>
    </div>
  );
}

function HouseholdStep({ theme, state, people, onChange, lang }) {
  const update = (idx, field, val) => {
    const next = people.map((p, i) => (i === idx ? { ...p, [field]: val } : p));
    onChange(next);
  };
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">{t(lang, "householdTitle")}</h2>
      <p className="text-sm text-slate-500 mb-4">{t(lang, "householdHint")}</p>
      {people.map((p, idx) => (
        <div key={p.id} className="mb-4 p-3 rounded-lg bg-slate-50">
          <Field label={idx === 0 ? t(lang, "householdName1") : t(lang, "householdName2")}>
            <input className={inputCls} value={p.label} onChange={(e) => update(idx, "label", e.target.value)} />
          </Field>
        </div>
      ))}
    </div>
  );
}

function ParentsStep({ theme, state, people, onChange, hideHeading, lang }) {
  const parent1 = people.find((p) => p.id === "p1") || { id: "p1", label: t(lang, "parentsP1") };
  const parent2 = people.find((p) => p.id === "p2");

  const updateLabel = (id, label) => onChange(people.map((p) => (p.id === id ? { ...p, label } : p)));
  const addParent2 = () => onChange([...people.filter((p) => p.id !== "p2"), { id: "p2", label: t(lang, "parentsP2") }]);
  const removeParent2 = () => onChange(people.filter((p) => p.id !== "p2"));

  return (
    <div>
      {!hideHeading && (
        <>
          <h2 className="text-lg font-semibold mb-1">{t(lang, "parentsTitle")}</h2>
          <p className="text-sm text-slate-500 mb-4">{t(lang, "parentsHint")}</p>
        </>
      )}
      <Field label={t(lang, "parentsP1")}>
        <input className={inputCls} value={parent1.label} onChange={(e) => updateLabel("p1", e.target.value)} placeholder="Ex : Maman" />
      </Field>
      {parent2 ? (
        <div className="p-3 rounded-lg bg-slate-50 mb-1">
          <Field label={t(lang, "parentsP2")}>
            <input className={inputCls} value={parent2.label} onChange={(e) => updateLabel("p2", e.target.value)} placeholder="Ex : Papa" />
          </Field>
          <button onClick={removeParent2} className="text-xs text-red-500">{t(lang, "parentsRemove2")}</button>
        </div>
      ) : (
        <button
          onClick={addParent2}
          className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg border"
          style={{ borderColor: theme.primary, color: theme.primary }}
        >
          <Plus size={16} /> {t(lang, "parentsAdd2")}
        </button>
      )}
    </div>
  );
}

const ChildrenStep = forwardRef(function ChildrenStep({ theme, state, items, onAdd, onRemove }, ref) {
  const lang = state.language || "fr";
  const [f, setF] = useState({ name: "", age: "", hasAccount: false, accountTitle: "REEE", balance: "" });
  const canSubmit = f.name;
  const submit = () => {
    onAdd({
      name: f.name,
      age: f.age ? Number(f.age) : null,
      account: f.hasAccount
        ? { title: f.accountTitle || "REEE", balance: Number(f.balance) || 0, history: [{ date: today, value: Number(f.balance) || 0 }] }
        : null,
    });
    setF({ name: "", age: "", hasAccount: false, accountTitle: "REEE", balance: "" });
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell
        title={t(lang, "childrenTitle")}
        hint={t(lang, "childrenHint")}
        theme={theme}
        canSubmit={canSubmit}
        onSubmit={submit}
        buttonLabel={t(lang, "childrenAddBtn")}
      >
        <Field label={t(lang, "childFirstName")}>
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label={t(lang, "childAgeOptional")}>
          <input type="number" className={inputCls} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 mb-3 text-sm">
          <input type="checkbox" checked={f.hasAccount} onChange={(e) => setF({ ...f, hasAccount: e.target.checked })} />
          {t(lang, "childOpenAccount")}
        </label>
        {f.hasAccount && (
          <>
            <Field label={t(lang, "childAccountName")}>
              <input className={inputCls} value={f.accountTitle} onChange={(e) => setF({ ...f, accountTitle: e.target.value })} />
            </Field>
            <Field label={`${t(lang, "childAccountBalance")} (${state.currency})`}>
              <input type="number" className={inputCls} value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} />
            </Field>
          </>
        )}
      </StepShell>
      <ListPreview items={items} onRemove={onRemove} render={(c) => `${c.name}${c.age ? ` (${c.age})` : ""}${c.account ? ` — ${c.account.title} : ${money(c.account.balance, state.currency)}` : ""}`} />
    </div>
  );
});

const AIDANT_RELATIONS = ["Parent", "Conjoint·e", "Enfant", "Frère/Sœur", "Ami·e", "Autre"];

const DEBT_ICONS = ["💳", "🚗", "🏠"];
const PROJECT_ICONS = ["🏖️", "💍", "🎯"];

function IconAvatar({ icon, color }) {
  return (
    <span
      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
      style={{ backgroundColor: `${color}1A` }}
    >
      {icon}
    </span>
  );
}

function IconPicker({ theme, value, onChange, options, lang }) {
  const isPreset = options.includes(value);
  const [customMode, setCustomMode] = useState(!!value && !isPreset);
  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        {options.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => { onChange(emoji); setCustomMode(false); }}
            className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg"
            style={{
              borderColor: !customMode && value === emoji ? theme.primary : "#e2e8f0",
              backgroundColor: !customMode && value === emoji ? theme.soft : "white",
            }}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className="w-10 h-10 rounded-lg border flex items-center justify-center text-slate-400"
          style={{ borderColor: customMode ? theme.primary : "#e2e8f0", backgroundColor: customMode ? theme.soft : "white" }}
        >
          <Pencil size={14} />
        </button>
      </div>
      {customMode && (
        <input
          type="text"
          value={isPreset ? "" : (value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(lang, "customIconPlaceholder")}
          className="mt-2 w-28 h-10 rounded-lg border border-slate-300 text-center text-lg"
          maxLength={8}
        />
      )}
    </div>
  );
}

const AidantStep = forwardRef(function AidantStep({ theme, state, items, onAdd, onRemove }, ref) {
  const lang = state.language || "fr";
  const [f, setF] = useState({ label: "", relation: "Parent" });
  const canSubmit = f.label;
  const submit = () => {
    onAdd({ label: f.label, relation: f.relation });
    setF({ label: "", relation: "Parent" });
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell
        title={t(lang, "aidantTitle")}
        hint={t(lang, "aidantHint")}
        theme={theme}
        canSubmit={canSubmit}
        onSubmit={submit}
        buttonLabel={t(lang, "aidantAddBtn")}
      >
        <Field label={t(lang, "aidantFirstName")}>
          <input className={inputCls} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Ex : Maman" />
        </Field>
        <Field label={t(lang, "aidantRelation")}>
          <select className={selectCls} value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>
            {AIDANT_RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </StepShell>
      <ListPreview items={items} onRemove={onRemove} render={(p) => `${p.label} — ${p.relation}`} />
    </div>
  );
});

const AutreStep = forwardRef(function AutreStep({ theme, state, items, onAdd, onRemove }, ref) {
  const lang = state.language || "fr";
  const [f, setF] = useState({ label: "", note: "" });
  const canSubmit = f.label;
  const submit = () => {
    onAdd({ label: f.label, note: f.note });
    setF({ label: "", note: "" });
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell
        title={t(lang, "autreTitle")}
        hint={t(lang, "autreHint")}
        theme={theme}
        canSubmit={canSubmit}
        onSubmit={submit}
        buttonLabel={t(lang, "autreAddBtn")}
      >
        <Field label={t(lang, "autreFirstName")}>
          <input className={inputCls} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Ex : Sam" />
        </Field>
        <Field label={t(lang, "autreRole")}>
          <input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Ex : colocataire" />
        </Field>
      </StepShell>
      <ListPreview items={items} onRemove={onRemove} render={(p) => `${p.label}${p.note ? ` — ${p.note}` : ""}`} />
    </div>
  );
});

function ThemeStep({ themeId, onPick, customColor, customSecondary, customAccent, onChangeCustom, hideHeading, lang }) {
  const previewTheme = customThemeFor({ customColor, customSecondary, customAccent });
  return (
    <div>
      {!hideHeading && (
        <>
          <h2 className="text-lg font-semibold mb-1">{t(lang, "themeTitle")}</h2>
          <p className="text-sm text-slate-500 mb-4">{t(lang, "themeHint")}</p>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        {PRESET_THEME_IDS.map((id) => {
          const themeObj = THEMES[id];
          return (
          <button
            key={id}
            onClick={() => onPick(id)}
            className={`rounded-xl p-3 text-left border-2 transition ${themeId === id ? "border-slate-800" : "border-transparent"}`}
            style={{ backgroundColor: themeObj.soft }}
          >
            <div className="flex gap-1.5 mb-2">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: themeObj.primary }} />
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: themeObj.secondary }} />
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: themeObj.accent }} />
            </div>
            <span className="text-sm font-medium" style={{ color: themeObj.text }}>{themeObj.name}</span>
          </button>
          );
        })}
        <button
          onClick={() => onPick("custom")}
          className={`rounded-xl p-3 text-left border-2 transition ${themeId === "custom" ? "border-slate-800" : "border-transparent"}`}
          style={{ backgroundColor: previewTheme.soft }}
        >
          <div className="flex gap-1.5 mb-2">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: previewTheme.primary }} />
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: previewTheme.secondary }} />
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: previewTheme.accent }} />
          </div>
          <span className="text-sm font-medium" style={{ color: previewTheme.text }}>{t(lang, "themeCustom")}</span>
        </button>
      </div>
      {themeId === "custom" && (
        <div className="mt-3 space-y-3 bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => onChangeCustom("customColor", e.target.value)}
              className="w-11 h-11 rounded-lg border border-slate-300 cursor-pointer shrink-0"
            />
            <span className="text-sm text-slate-500 flex-1 min-w-0">{t(lang, "themeCustomHintPrimary")}</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={previewTheme.secondary}
              onChange={(e) => onChangeCustom("customSecondary", e.target.value)}
              className="w-11 h-11 rounded-lg border border-slate-300 cursor-pointer shrink-0"
            />
            <span className="text-sm text-slate-500 flex-1 min-w-0">{t(lang, "themeCustomHintSecondary")}</span>
            {customSecondary && (
              <button onClick={() => onChangeCustom("customSecondary", null)} className="text-xs underline text-slate-400 shrink-0">
                {t(lang, "resetToAuto")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={previewTheme.accent}
              onChange={(e) => onChangeCustom("customAccent", e.target.value)}
              className="w-11 h-11 rounded-lg border border-slate-300 cursor-pointer shrink-0"
            />
            <span className="text-sm text-slate-500 flex-1 min-w-0">{t(lang, "themeCustomHintAccent")}</span>
            {customAccent && (
              <button onClick={() => onChangeCustom("customAccent", null)} className="text-xs underline text-slate-400 shrink-0">
                {t(lang, "resetToAuto")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepShell({ title, hint, children, onSubmit, canSubmit, buttonLabel, theme, lang }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {hint && <p className="text-sm text-slate-500 mb-4">{hint}</p>}
      {children}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="mt-1 w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white px-4 py-3 rounded-xl shadow-sm disabled:opacity-40"
        style={{ backgroundColor: theme.primary }}
      >
        <Plus size={18} /> {buttonLabel || t(lang || "fr", "add")}
      </button>
    </div>
  );
}

function ListPreview({ items, onRemove, render }) {
  if (!items.length) return null;
  return (
    <ul className="mt-4 space-y-2">
      {items.map((it) => (
        <li key={it.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
          <span className="min-w-0 break-words">{render(it)}</span>
          <span className="shrink-0"><ConfirmDeleteButton onConfirm={() => onRemove(it.id)} /></span>
        </li>
      ))}
    </ul>
  );
}

function FreqButtons({ theme, value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          onClick={() => onChange(o.id)}
          className="rounded-lg border px-2.5 py-2 text-xs"
          style={{
            borderColor: value === o.id ? theme.primary : "#e2e8f0",
            backgroundColor: value === o.id ? theme.soft : "white",
            color: value === o.id ? theme.text : "#64748b",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Construit les options traduites pour FreqButtons à partir d'une liste d'identifiants
const FREQ_KEY = {
  mensuel: "freqMonthly",
  hebdomadaire: "freqWeekly",
  "bi-hebdomadaire": "freqBiweekly",
  bimestriel: "freqBimonthly",
  annuel: "freqYearly",
  unique: "repaymentUnique",
  recurrent: "repaymentRecurrent",
};
function freqOptions(lang, ids) {
  return ids.map((id) => ({ id, label: t(lang, FREQ_KEY[id] || id) }));
}

const DebtsStep = forwardRef(function DebtsStep({ theme, state, items, onAdd, onSave, onRemove, editItem, hideList }, ref) {
  const lang = state.language || "fr";
  const isEdit = !!editItem;
  const [f, setF] = useState(() => editItem ? {
    title: editItem.title,
    icon: editItem.icon || DEBT_ICONS[0],
    amount: String(editItem.amount),
    remainingAmount: String(editItem.amount - editItem.paid),
    interestRate: editItem.interestRate != null ? String(editItem.interestRate) : "",
    paymentMode: editItem.paymentMode,
    dueDate: editItem.dueDate || today,
    startDate: editItem.startDate || today,
    endDateMode: "date",
    endDate: editItem.endDate || "",
    durationMonths: "",
    frequency: editItem.frequency || "mensuel",
    owner: editItem.owner || "commun",
  } : { title: "", icon: DEBT_ICONS[0], amount: "", remainingAmount: "", interestRate: "", paymentMode: "recurrent", dueDate: today, startDate: today, endDateMode: "date", endDate: "", durationMonths: "", frequency: "mensuel", owner: "commun" });
  const canSubmit = f.title && f.amount && (f.paymentMode === "unique" ? f.dueDate : (f.endDateMode === "date" ? f.endDate : f.durationMonths));
  const submit = () => {
    const total = Number(f.amount);
    const remaining = f.remainingAmount !== "" ? Number(f.remainingAmount) : total;
    const paid = Math.max(0, Math.min(total, total - remaining));
    const base = { title: f.title, icon: f.icon, amount: total, paid, owner: f.owner, paymentMode: f.paymentMode, interestRate: f.interestRate !== "" ? Number(f.interestRate) : null };
    const resolvedEndDate = f.endDateMode === "date" ? f.endDate : addMonthsFromToday(f.durationMonths);
    const item = f.paymentMode === "unique"
      ? { ...base, dueDate: f.dueDate, startDate: undefined, endDate: undefined, frequency: undefined }
      : { ...base, startDate: f.startDate, endDate: resolvedEndDate, frequency: f.frequency, dueDate: undefined };
    if (isEdit) {
      onSave(editItem.id, item);
    } else {
      onAdd(item);
      setF({ title: "", icon: DEBT_ICONS[0], amount: "", remainingAmount: "", interestRate: "", paymentMode: "recurrent", dueDate: today, startDate: today, endDateMode: "date", endDate: "", durationMonths: "", frequency: "mensuel", owner: "commun" });
    }
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell title={t(lang, "debtsTitle")} hint={t(lang, "debtsHint")} theme={theme} canSubmit={canSubmit} onSubmit={submit} buttonLabel={isEdit ? t(lang, "saveChanges") : undefined} lang={lang}>
        <Field label={t(lang, "fieldTitle")}>
          <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex : Prêt voiture" />
        </Field>
        <Field label={t(lang, "fieldIcon")}>
          <IconPicker theme={theme} value={f.icon} onChange={(v) => setF({ ...f, icon: v })} options={DEBT_ICONS} lang={lang} />
        </Field>

        <div className="p-3 rounded-lg bg-slate-50 mb-3">
          <Field label={`${t(lang, "fieldDebtTotal")} (${state.currency})`}>
            <input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </Field>
          <Field label={`${t(lang, "fieldDebtRemaining")} (${state.currency})`}>
            <input type="number" className={inputCls} value={f.remainingAmount} onChange={(e) => setF({ ...f, remainingAmount: e.target.value })} placeholder={f.amount || "0"} />
          </Field>
          <label className="block">
            <span className="block text-sm font-medium mb-1 text-slate-600">{t(lang, "fieldInterestRate")}</span>
            <input type="number" step="0.01" className={inputCls} value={f.interestRate} onChange={(e) => setF({ ...f, interestRate: e.target.value })} placeholder={t(lang, "interestRatePlaceholder")} />
          </label>
        </div>

        <Field label={t(lang, "fieldRepayment")}>
          <FreqButtons
            theme={theme}
            value={f.paymentMode}
            onChange={(v) => setF({ ...f, paymentMode: v })}
            options={freqOptions(lang, ["unique", "recurrent"])}
          />
        </Field>
        {f.paymentMode === "unique" ? (
          <Field label={t(lang, "fieldDueDateFull")}>
            <input type="date" className={selectCls} style={dateInputStyle} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          </Field>
        ) : (
          <div className="p-3 rounded-lg bg-slate-50">
            <Field label={t(lang, "fieldDebtStart")}>
              <input type="date" className={selectCls} style={dateInputStyle} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
            </Field>
            <p className="text-xs text-slate-400 -mt-2 mb-3">{t(lang, "debtStartHint")}</p>

            <Field label={t(lang, "endDateModeQuestion")}>
              <FreqButtons
                theme={theme}
                value={f.endDateMode}
                onChange={(v) => setF({ ...f, endDateMode: v })}
                options={[
                  { id: "date", label: t(lang, "endDateModeDate") },
                  { id: "duration", label: t(lang, "endDateModeDuration") },
                ]}
              />
            </Field>
            {f.endDateMode === "date" ? (
              <Field label={t(lang, "fieldDebtEnd")}>
                <input type="date" className={selectCls} style={dateInputStyle} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
              </Field>
            ) : (
              <Field label={t(lang, "durationMonthsLabel")}>
                <input type="number" min="1" className={inputCls} value={f.durationMonths} onChange={(e) => setF({ ...f, durationMonths: e.target.value })} placeholder="Ex : 18" />
              </Field>
            )}

            <Field label={t(lang, "fieldRepaymentFreq")}>
              <FreqButtons
                theme={theme}
                value={f.frequency}
                onChange={(v) => setF({ ...f, frequency: v })}
                options={freqOptions(lang, ["mensuel", "hebdomadaire", "bi-hebdomadaire"])}
              />
            </Field>
          </div>
        )}
        <OwnerSelect theme={theme} state={state} value={f.owner} onChange={(v) => setF({ ...f, owner: v })} />
      </StepShell>
      {!hideList && (
        <ListPreview
          items={items}
          onRemove={onRemove}
          render={(d) => d.paymentMode === "unique"
            ? `${d.title} — ${money(d.amount - d.paid, state.currency)} restant — échéance le ${d.dueDate}`
            : `${d.title} — ${money(d.amount - d.paid, state.currency)} restant — jusqu'au ${d.endDate}`}
        />
      )}
    </div>
  );
});

const ProjectsStep = forwardRef(function ProjectsStep({ theme, state, items, onAdd, onSave, onRemove, editItem, hideList }, ref) {
  const lang = state.language || "fr";
  const isEdit = !!editItem;
  const [f, setF] = useState(() => editItem ? {
    title: editItem.title,
    icon: editItem.icon || PROJECT_ICONS[0],
    amount: String(editItem.target),
    startDate: editItem.startDate || today,
    endDate: editItem.endDate || "",
    term: editItem.term,
    owner: editItem.owner || "commun",
    frequency: editItem.frequency || "mensuel",
  } : { title: "", icon: PROJECT_ICONS[0], amount: "", startDate: today, endDate: "", term: "court", owner: "commun", frequency: "mensuel" });
  const [termTouched, setTermTouched] = useState(!!editItem);
  const canSubmit = f.title && f.amount && f.startDate && f.endDate;

  useEffect(() => {
    if (termTouched) return;
    const suggested = suggestTerm(f.startDate, f.endDate);
    if (suggested) setF((prev) => ({ ...prev, term: suggested }));
  }, [f.startDate, f.endDate, termTouched]);

  const submit = () => {
    const item = { title: f.title, icon: f.icon, target: Number(f.amount), term: f.term, owner: f.owner, startDate: f.startDate, endDate: f.endDate, frequency: f.frequency };
    if (isEdit) {
      onSave(editItem.id, item);
    } else {
      onAdd({ ...item, saved: 0 });
      setF({ title: "", icon: PROJECT_ICONS[0], amount: "", startDate: today, endDate: "", term: "court", owner: "commun", frequency: "mensuel" });
      setTermTouched(false);
    }
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell title={t(lang, "projectsTitle")} hint={t(lang, "projectsHint")} theme={theme} canSubmit={canSubmit} onSubmit={submit} buttonLabel={isEdit ? t(lang, "saveChanges") : undefined} lang={lang}>
        <Field label={t(lang, "fieldTitle")}>
          <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex : Vacances au Japon" />
        </Field>
        <Field label={t(lang, "fieldIcon")}>
          <IconPicker theme={theme} value={f.icon} onChange={(v) => setF({ ...f, icon: v })} options={PROJECT_ICONS} lang={lang} />
        </Field>
        <Field label={`${t(lang, "fieldProjectAmount")} (${state.currency})`}>
          <input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label={t(lang, "fieldProjectStart")}>
          <input type="date" className={selectCls} style={dateInputStyle} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label={t(lang, "fieldProjectEnd")}>
          <input type="date" className={selectCls} style={dateInputStyle} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
        </Field>
        <Field label={t(lang, "fieldSavingFreq")}>
          <FreqButtons
            theme={theme}
            value={f.frequency}
            onChange={(v) => setF({ ...f, frequency: v })}
            options={freqOptions(lang, ["mensuel", "hebdomadaire", "bi-hebdomadaire"])}
          />
        </Field>
        <Field label={termTouched ? t(lang, "termLabel") : t(lang, "termSuggested")}>
          <div className="flex gap-2">
            {TERMES.map((term) => (
              <button
                type="button"
                key={term.id}
                onClick={() => { setF({ ...f, term: term.id }); setTermTouched(true); }}
                className="flex-1 rounded-lg border px-2 py-2 text-xs"
                style={{
                  borderColor: f.term === term.id ? theme.primary : "#e2e8f0",
                  backgroundColor: f.term === term.id ? theme.soft : "white",
                  color: f.term === term.id ? theme.text : "#64748b",
                }}
              >
                {t(lang, TERM_KEY[term.id])}
              </button>
            ))}
          </div>
        </Field>
        <OwnerSelect theme={theme} state={state} value={f.owner} onChange={(v) => setF({ ...f, owner: v })} />
      </StepShell>
      {!hideList && (
        <ListPreview items={items} onRemove={onRemove} render={(p) => `${p.title} — ${money(p.target, state.currency)} — jusqu'au ${p.endDate}`} />
      )}
    </div>
  );
});

const RecurringStep = forwardRef(function RecurringStep({ theme, state, title, hint, items, onAdd, onSave, onRemove, editItem, hideList }, ref) {
  const lang = state.language || "fr";
  const isEdit = !!editItem;
  const [f, setF] = useState(() => editItem ? {
    title: editItem.title,
    day: editItem.day != null ? String(editItem.day) : "",
    amount: String(editItem.amount),
    period: editItem.period,
    month: editItem.month != null ? String(editItem.month) : "1",
    startDate: editItem.startDate || today,
    owner: editItem.owner || "commun",
  } : { title: "", day: "", amount: "", period: "mensuel", month: "1", startDate: today, owner: "commun" });
  const usesStartDate = ["hebdomadaire", "bi-hebdomadaire", "bimestriel"].includes(f.period);
  const canSubmit = f.title && f.amount && (usesStartDate ? f.startDate : f.day);
  const submit = () => {
    const base = { title: f.title, amount: Number(f.amount), period: f.period, owner: f.owner };
    const item = usesStartDate
      ? { ...base, startDate: f.startDate, day: null, month: null }
      : { ...base, day: Number(f.day), month: f.period === "annuel" ? Number(f.month) : null, startDate: null };
    if (isEdit) {
      onSave(editItem.id, item);
    } else {
      onAdd(item);
      setF({ title: "", day: "", amount: "", period: "mensuel", month: "1", startDate: today, owner: "commun" });
    }
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell title={title} hint={hint} theme={theme} canSubmit={canSubmit} onSubmit={submit} buttonLabel={isEdit ? t(lang, "saveChanges") : undefined} lang={lang}>
        <Field label={t(lang, "fieldTitle")}>
          <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label={`${t(lang, "fieldAmount")} (${state.currency})`}>
          <input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label={t(lang, "fieldFrequency")}>
          <FreqButtons
            theme={theme}
            value={f.period}
            onChange={(v) => setF({ ...f, period: v })}
            options={freqOptions(lang, ["hebdomadaire", "bi-hebdomadaire", "mensuel", "bimestriel", "annuel"])}
          />
        </Field>
        {usesStartDate ? (
          <Field label={t(lang, "fieldNextPaymentDate")}>
            <input type="date" className={selectCls} style={dateInputStyle} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
          </Field>
        ) : (
          <Field label={t(lang, "fieldPaymentDay")}>
            <input type="number" min="1" max="31" className={inputCls} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} />
          </Field>
        )}
        {f.period === "annuel" && (
          <Field label={t(lang, "fieldMonth")}>
            <select className={selectCls} value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>
              {monthsFor(lang).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        )}
        <OwnerSelect theme={theme} state={state} value={f.owner} onChange={(v) => setF({ ...f, owner: v })} />
      </StepShell>
      {!hideList && (
        <ListPreview
          items={items}
          onRemove={onRemove}
          render={(x) => x.startDate
            ? `${x.title} — ${money(x.amount, state.currency)} (${x.period}) — ${x.startDate}`
            : `${x.title} — ${x.day} — ${money(x.amount, state.currency)} (${x.period})`}
        />
      )}
    </div>
  );
});

const PaydaysStep = forwardRef(function PaydaysStep({ theme, state, items, onAdd, onSave, onRemove, editItem, hideList }, ref) {
  const lang = state.language || "fr";
  const isEdit = !!editItem;
  const [f, setF] = useState(() => editItem ? {
    title: editItem.title, amount: String(editItem.amount), frequency: editItem.frequency, startDate: editItem.startDate || today, owner: editItem.owner || "commun",
  } : { title: "Salaire", amount: "", frequency: "mensuel", startDate: today, owner: "commun" });
  const canSubmit = f.amount && f.startDate;
  const submit = () => {
    const item = { title: f.title || "Paie", amount: Number(f.amount), frequency: f.frequency, startDate: f.startDate, owner: f.owner };
    if (isEdit) {
      onSave(editItem.id, item);
    } else {
      onAdd(item);
      setF({ title: "Salaire", amount: "", frequency: "mensuel", startDate: today, owner: "commun" });
    }
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell title={t(lang, "paydaysTitle")} hint={t(lang, "paydaysHint")} theme={theme} canSubmit={canSubmit} onSubmit={submit} buttonLabel={isEdit ? t(lang, "saveChanges") : undefined} lang={lang}>
        <Field label={t(lang, "fieldLabel")}>
          <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label={`${t(lang, "fieldNetAmount")} (${state.currency})`}>
          <input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label={t(lang, "fieldFrequency")}>
          <FreqButtons
            theme={theme}
            value={f.frequency}
            onChange={(v) => setF({ ...f, frequency: v })}
            options={freqOptions(lang, ["mensuel", "hebdomadaire", "bi-hebdomadaire"])}
          />
        </Field>
        <Field label={t(lang, "fieldNextPayday")}>
          <input type="date" className={selectCls} style={dateInputStyle} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <OwnerSelect theme={theme} state={state} value={f.owner} onChange={(v) => setF({ ...f, owner: v })} />
      </StepShell>
      {!hideList && (
        <ListPreview items={items} onRemove={onRemove} render={(x) => `${x.title} — ${money(x.amount, state.currency)} — ${x.frequency} — ${x.startDate}`} />
      )}
    </div>
  );
});

const InvestmentsStep = forwardRef(function InvestmentsStep({ theme, state, items, onAdd, onSave, onRemove, editItem, hideList }, ref) {
  const lang = state.language || "fr";
  const isEdit = !!editItem;
  const [f, setF] = useState(() => editItem ? {
    title: editItem.title, type: editItem.type, value: String(editItem.value), owner: editItem.owner || "commun",
  } : { title: "", type: "Bourse", value: "", owner: "commun" });
  const canSubmit = isEdit ? f.title : (f.title && f.value);
  const submit = () => {
    if (isEdit) {
      onSave(editItem.id, { title: f.title, type: f.type, owner: f.owner });
    } else {
      onAdd({ title: f.title, type: f.type, value: Number(f.value), owner: f.owner, history: [{ date: today, value: Number(f.value) }] });
      setF({ title: "", type: "Bourse", value: "", owner: "commun" });
    }
  };
  useImperativeHandle(ref, () => ({ commit: () => { if (canSubmit) submit(); } }));
  return (
    <div>
      <StepShell title={t(lang, "investmentsTitle")} hint={isEdit ? "" : t(lang, "investmentsHint")} theme={theme} canSubmit={canSubmit} onSubmit={submit} buttonLabel={isEdit ? t(lang, "saveChanges") : undefined} lang={lang}>
        <Field label={t(lang, "fieldInvestmentTitle")}>
          <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex : PEA, Livret, Crypto…" />
        </Field>
        <Field label={t(lang, "fieldInvestmentType")}>
          <select className={selectCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option>Bourse</option>
            <option>Immobilier</option>
            <option>Épargne</option>
            <option>Crypto</option>
            <option>Autre</option>
          </select>
        </Field>
        {!isEdit && (
          <Field label={`${t(lang, "fieldCurrentValue")} (${state.currency})`}>
            <input type="number" className={inputCls} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          </Field>
        )}
        {isEdit && (
          <p className="text-xs text-slate-400 mb-3">{t(lang, "investmentEditNote")}</p>
        )}
        <OwnerSelect theme={theme} state={state} value={f.owner} onChange={(v) => setF({ ...f, owner: v })} />
      </StepShell>
      {!hideList && (
        <ListPreview items={items} onRemove={onRemove} render={(x) => `${x.title} (${x.type}) — ${money(x.value, state.currency)}`} />
      )}
    </div>
  );
});

function RecapStep({ theme, state, onEdit }) {
  const lang = state.language || "fr";
  const rows = [
    [t(lang, "recapDebts"), state.debts.length, "debts"],
    [t(lang, "recapProjects"), state.projects.length, "projects"],
    [t(lang, "recapSubscriptions"), state.subscriptions.length, "subscriptions"],
    [t(lang, "recapBills"), state.bills.length, "bills"],
    [t(lang, "recapPaydays"), state.paydays.length, "paydays"],
    [t(lang, "recapInvestments"), state.investments.length, "investments"],
  ];
  if (state.profileType === "parent") {
    rows.splice(0, 0, [t(lang, "recapParents"), state.people.length, "parents"], [t(lang, "recapChildren"), state.children.length, "children"]);
  }
  if (state.profileType === "aidant") rows.splice(0, 0, [t(lang, "recapAidant"), state.people.length, "aidant"]);
  if (state.profileType === "autre") rows.splice(0, 0, [t(lang, "recapPeople"), state.people.length, "autre-people"]);
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">{t(lang, "recapTitle")}</h2>
      <p className="text-sm text-slate-500 mb-4">{t(lang, "recapHint")}</p>
      <ul className="space-y-1.5">
        {rows.map(([label, count, stepId]) => (
          <li key={label}>
            <button
              onClick={() => onEdit(stepId)}
              className="w-full flex justify-between items-center text-sm bg-slate-50 rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              <span className="text-slate-600">{label}</span>
              <span className="flex items-center gap-2">
                <span className="font-medium" style={{ color: theme.primary }}>{count}</span>
                <ArrowRight size={14} className="text-slate-400" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendrier
// ---------------------------------------------------------------------------
function CalendarTab({ theme, state, setState }) {
  const lang = state.language || "fr";
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMode, setAddMode] = useState(null); // "payday" | "bill" | "subscription"

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const firstWeekday = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;

  const eventsOnYMD = (y, m, day) => {
    const list = [];

    state.paydays.forEach((p) => {
      if (!p.startDate || !p.frequency) return;
      if (occurrencesInMonth(p.startDate, p.frequency, y, m).includes(day)) {
        list.push({ kind: "paie", title: p.title, amount: p.amount, owner: p.owner });
      }
    });

    state.subscriptions.forEach((s) => {
      if (s.startDate) {
        if (occurrencesInMonth(s.startDate, s.period, y, m).includes(day)) {
          list.push({ kind: "abonnement", title: s.title, amount: s.amount, owner: s.owner });
        }
      } else {
        const monthMatches = s.period === "mensuel" || (s.period === "annuel" && s.month === m + 1);
        if (s.day === day && monthMatches) list.push({ kind: "abonnement", title: s.title, amount: s.amount, owner: s.owner });
      }
    });

    state.bills.forEach((b) => {
      if (b.startDate) {
        if (occurrencesInMonth(b.startDate, b.period, y, m).includes(day)) {
          list.push({ kind: "facture", title: b.title, amount: b.amount, owner: b.owner });
        }
      } else {
        const monthMatches = b.period === "mensuel" || (b.period === "annuel" && b.month === m + 1);
        if (b.day === day && monthMatches) list.push({ kind: "facture", title: b.title, amount: b.amount, owner: b.owner });
      }
    });

    state.debts.forEach((d) => {
      if (d.paymentMode === "unique" && d.dueDate) {
        const dd = new Date(d.dueDate + "T00:00:00");
        if (dd.getFullYear() === y && dd.getMonth() === m && dd.getDate() === day) {
          list.push({ kind: "dette", title: d.title, amount: d.amount - d.paid, owner: d.owner });
        }
      } else if (d.paymentMode === "recurrent" && d.startDate && d.frequency && d.endDate) {
        const occDate = new Date(y, m, day);
        const endD = new Date(d.endDate + "T00:00:00");
        if (occDate <= endD && occurrencesInMonth(d.startDate, d.frequency, y, m).includes(day)) {
          list.push({ kind: "dette", title: d.title, amount: debtInstallment(d), owner: d.owner });
        }
      }
    });

    state.projects.forEach((p) => {
      if (!p.startDate || !p.frequency || !p.endDate) return;
      const occDate = new Date(y, m, day);
      const endD = new Date(p.endDate + "T00:00:00");
      if (occDate <= endD && occurrencesInMonth(p.startDate, p.frequency, y, m).includes(day)) {
        list.push({ kind: "projet", title: p.title, amount: projectInstallment(p), owner: p.owner });
      }
    });

    return HAS_OWNERS.includes(state.profileType) && ownerFilter !== "all"
      ? list.filter((e) => e.owner === ownerFilter)
      : list;
  };

  const eventsForDay = (day) => eventsOnYMD(cursor.y, cursor.m, day);

  const dotColor = { paie: "#2E9E5B", abonnement: theme.secondary, facture: theme.danger, dette: "#9333EA", projet: "#0EA5E9" };
  const kindLabel = { paie: "Paie", abonnement: "Abonnement", facture: "Facture", dette: "Dette", projet: "Projet" };
  const kindIcon = { paie: Wallet, abonnement: Coins, facture: Lightbulb, dette: CreditCard, projet: Target };

  // Prochains jours : tout ce qui tombe dans les 7 prochains jours, tous types confondus
  const upcomingEvents = useMemo(() => {
    const results = [];
    const startD = new Date();
    startD.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 7; i++) {
      const d = new Date(startD);
      d.setDate(d.getDate() + i);
      const dayEvents = eventsOnYMD(d.getFullYear(), d.getMonth(), d.getDate());
      dayEvents.forEach((e) => results.push({ ...e, date: d, daysUntil: i }));
    }
    return results;
  }, [state, ownerFilter]);

  const daysUntilLabel = (n) => {
    if (n === 0) return t(lang, "today");
    if (n === 1) return t(lang, "tomorrow");
    return t(lang, "inNDays").replace("{n}", n);
  };

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const changeMonth = (delta) => {
    let m = cursor.m + delta, y = cursor.y;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCursor({ y, m });
    setSelectedDay(null);
  };

  const monthTotal = useMemo(() => {
    let income = 0, expense = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      eventsForDay(d).forEach((e) => {
        if (e.kind === "paie") income += e.amount;
        else expense += e.amount;
      });
    }
    return { income, expense };
  }, [cursor, state, ownerFilter]);

  // Répartition des dépenses par catégorie — pour le jour sélectionné, ou pour tout le mois si aucun jour choisi
  const breakdown = useMemo(() => {
    const totals = { abonnement: 0, facture: 0, dette: 0, projet: 0 };
    if (selectedDay) {
      eventsForDay(selectedDay).forEach((e) => { if (totals[e.kind] !== undefined) totals[e.kind] += e.amount; });
    } else {
      for (let d = 1; d <= daysInMonth; d++) {
        eventsForDay(d).forEach((e) => { if (totals[e.kind] !== undefined) totals[e.kind] += e.amount; });
      }
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([kind, value]) => ({ kind, value, label: kindLabel[kind], color: dotColor[kind] }));
  }, [cursor, state, ownerFilter, selectedDay]);
  const breakdownTotal = breakdown.reduce((a, b) => a + b.value, 0);

  // Patrimoine net : ce qui est mis de côté (investissements + épargne projets) moins ce qu'il reste à rembourser
  const netWorth = useMemo(() => {
    const byOwner = (arr) => (HAS_OWNERS.includes(state.profileType) && ownerFilter !== "all" ? arr.filter((x) => x.owner === ownerFilter) : arr);
    const investmentsTotal = byOwner(state.investments).reduce((a, i) => a + i.value, 0);
    const projectsSaved = byOwner(state.projects).reduce((a, p) => a + p.saved, 0);
    const debtsRemaining = byOwner(state.debts).reduce((a, d) => a + (d.amount - d.paid), 0);
    const assets = investmentsTotal + projectsSaved;
    return { assets, debts: debtsRemaining, net: assets - debtsRemaining };
  }, [state, ownerFilter]);

  return (
    <div className="p-4 pb-24">
      <div className="rounded-xl shadow-sm p-4 mb-4" style={{ backgroundColor: theme.primary }}>
        <p className="text-xs text-white opacity-80">{t(lang, "netWorthLabel")}</p>
        <p className="text-3xl font-semibold text-white">{money(netWorth.net, state.currency)}</p>
        <div className="flex justify-between text-xs text-white opacity-90 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.25)" }}>
          <span>{t(lang, "assetsLabel")} · {money(netWorth.assets, state.currency)}</span>
          <span>{t(lang, "debtsLabelShort")} · {money(netWorth.debts, state.currency)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} /></button>
          <h2 className="font-semibold px-1" style={{ color: theme.text }}>{monthsFor(lang)[cursor.m]} {cursor.y}</h2>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight size={18} /></button>
        </div>
        <button onClick={() => setShowAddMenu(true)} className="p-2 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>
          <Plus size={18} />
        </button>
      </div>

      <OwnerFilterBar theme={theme} state={state} value={ownerFilter} onChange={setOwnerFilter} />

      <div className="flex gap-3 mb-4 text-xs">
        <span className="flex-1 bg-white rounded-lg p-2 text-center shadow-sm">
          <span className="block text-slate-400">Entrées</span>
          <span className="font-semibold" style={{ color: "#2E9E5B" }}>{money(monthTotal.income, state.currency)}</span>
        </span>
        <span className="flex-1 bg-white rounded-lg p-2 text-center shadow-sm">
          <span className="block text-slate-400">Sorties</span>
          <span className="font-semibold" style={{ color: theme.danger }}>{money(monthTotal.expense, state.currency)}</span>
        </span>
      </div>

      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium" style={{ color: theme.text }}>{t(lang, "upcomingDays")}</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {upcomingEvents.map((e, idx) => {
              const Icon = kindIcon[e.kind];
              const isIncome = e.kind === "paie";
              return (
                <li key={idx} className="flex items-center gap-3 py-2.5">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${dotColor[e.kind]}1A` }}>
                    <Icon size={16} style={{ color: dotColor[e.kind] }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{e.title}</span>
                    <span className="block text-xs text-slate-400">{daysUntilLabel(e.daysUntil)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-medium" style={{ color: isIncome ? "#2E9E5B" : theme.text }}>
                      {isIncome ? "+" : "-"}{money(e.amount, state.currency)}
                    </span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor[e.kind] }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-medium mb-1" style={{ color: theme.text }}>
          {selectedDay ? `Où va ton argent — le ${selectedDay} ${monthsFor(lang)[cursor.m]}` : "Où va ton argent — ce mois-ci"}
        </h3>
        {selectedDay && (
          <button onClick={() => setSelectedDay(null)} className="text-xs mb-2" style={{ color: theme.primary }}>
            ← Revenir à la vue du mois
          </button>
        )}
        {breakdownTotal === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Rien à répartir {selectedDay ? "pour ce jour" : "ce mois-ci"}.</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-28 h-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="label" innerRadius={28} outerRadius={50} paddingAngle={2}>
                    {breakdown.map((b) => <Cell key={b.kind} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(v, state.currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1.5">
              {breakdown.map((b) => (
                <li key={b.kind} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} /> {b.label}
                  </span>
                  <span className="text-slate-400">{money(b.value, state.currency)} · {Math.round((b.value / breakdownTotal) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
        {weekdaysFor(lang).map((j, i) => <div key={i}>{j}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const evs = eventsForDay(d);
          const isSelected = selectedDay === d;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(d)}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative"
              style={{
                backgroundColor: isSelected ? theme.primary : evs.length ? theme.soft : "white",
                color: isSelected ? "white" : theme.text,
                border: "1px solid #f1f5f9",
              }}
            >
              <span>{d}</span>
              {evs.length > 0 && (
                <span className="flex gap-0.5 mt-0.5">
                  {evs.slice(0, 3).map((e, idx) => (
                    <span key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? "white" : dotColor[e.kind] }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-slate-500">
        {Object.entries(kindLabel).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor[k] }} /> {l}
          </span>
        ))}
      </div>

      {selectedDay && (
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium mb-2 text-sm">Le {selectedDay} {monthsFor(lang)[cursor.m]}</h3>
          {eventsForDay(selectedDay).length === 0 ? (
            <p className="text-sm text-slate-400">Rien de prévu ce jour.</p>
          ) : (
            <ul className="space-y-2">
              {eventsForDay(selectedDay).map((e, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor[e.kind] }} />
                    {e.title} <span className="text-slate-400">· {kindLabel[e.kind]}</span>
                    <OwnerBadge ownerId={e.owner} state={state} />
                  </span>
                  <span className="font-medium" style={{ color: e.kind === "paie" ? "#2E9E5B" : theme.text }}>
                    {e.kind === "paie" ? "+" : "-"}{money(e.amount, state.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showAddMenu && (
        <BottomSheet title={t(lang, "manageWhat")} onClose={() => setShowAddMenu(false)}>
          <div className="space-y-2">
            <button
              onClick={() => { setShowAddMenu(false); setAddMode("payday"); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2E9E5B1A" }}>
                <Wallet size={16} style={{ color: "#2E9E5B" }} />
              </span>
              <span>
                <span className="block text-sm font-medium">{t(lang, "recapPaydays")}</span>
                <span className="block text-xs text-slate-400">{t(lang, "manageIncomeDesc")}</span>
              </span>
            </button>
            <button
              onClick={() => { setShowAddMenu(false); setAddMode("bill"); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.danger}1A` }}>
                <Lightbulb size={16} style={{ color: theme.danger }} />
              </span>
              <span>
                <span className="block text-sm font-medium">{t(lang, "billsTitle")}</span>
                <span className="block text-xs text-slate-400">{t(lang, "manageBillsDesc")}</span>
              </span>
            </button>
            <button
              onClick={() => { setShowAddMenu(false); setAddMode("subscription"); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.soft }}>
                <Coins size={16} style={{ color: theme.secondary }} />
              </span>
              <span>
                <span className="block text-sm font-medium">{t(lang, "subscriptionsTitle")}</span>
                <span className="block text-xs text-slate-400">{t(lang, "manageSubsDesc")}</span>
              </span>
            </button>
          </div>
        </BottomSheet>
      )}

      {addMode === "payday" && (
        <ManageListSheet
          sheetTitle={t(lang, "recapPaydays")}
          theme={theme}
          state={state}
          setState={setState}
          field="paydays"
          StepComp={PaydaysStep}
          renderRow={(x) => `${x.title} — ${money(x.amount, state.currency)} — ${x.frequency}`}
          onClose={() => setAddMode(null)}
        />
      )}

      {addMode === "bill" && (
        <ManageListSheet
          sheetTitle={t(lang, "billsTitle")}
          theme={theme}
          state={state}
          setState={setState}
          field="bills"
          StepComp={RecurringStep}
          stepExtraProps={{ title: t(lang, "billsTitle"), hint: t(lang, "billsHint") }}
          renderRow={(x) => `${x.title} — ${money(x.amount, state.currency)} (${x.period})`}
          onClose={() => setAddMode(null)}
        />
      )}

      {addMode === "subscription" && (
        <ManageListSheet
          sheetTitle={t(lang, "subscriptionsTitle")}
          theme={theme}
          state={state}
          setState={setState}
          field="subscriptions"
          StepComp={RecurringStep}
          stepExtraProps={{ title: t(lang, "subscriptionsTitle"), hint: t(lang, "subscriptionsHint") }}
          renderRow={(x) => `${x.title} — ${money(x.amount, state.currency)} (${x.period})`}
          onClose={() => setAddMode(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dettes (enveloppes)
// ---------------------------------------------------------------------------
function GoalResult({ d, goalMonths, disponible, theme, currency }) {
  const remaining = Math.max(0, d.amount - d.paid);
  const goalMonthly = amortizedInstallment(remaining, d.interestRate, goalMonths, "mensuel");
  const currentMonthly = Math.round(monthlyEquivalent(debtInstallment(d), d.frequency));
  const extra = goalMonthly - currentMonthly;
  const monthlyInterestOnly = Math.ceil(interestOnlyPayment(remaining, d.interestRate, "mensuel"));
  const tooLow = d.interestRate && goalMonthly <= monthlyInterestOnly;

  if (tooLow) {
    return (
      <div className="text-xs mt-2 p-2.5 rounded-lg leading-relaxed" style={{ backgroundColor: "#FEF2F2", color: "#991B1B" }}>
        ⚠️ À {money(goalMonthly, currency)}/mois et {d.interestRate}% d'intérêt, tu couvres à peine les intérêts
        (~{money(monthlyInterestOnly, currency)}/mois) — le capital ne baisserait presque pas à ce rythme. Vise un
        montant plus élevé, ou repousse la date de fin.
      </div>
    );
  }

  if (extra <= 0) {
    return <p className="text-xs mt-2 font-medium" style={{ color: "#2E9E5B" }}>Ton rythme actuel suffit déjà pour ça 🎉</p>;
  }
  const feasible = extra <= disponible;
  return (
    <div className="text-xs mt-2 p-2.5 rounded-lg leading-relaxed" style={{ backgroundColor: feasible ? "#ECFDF5" : "#FEF2F2", color: feasible ? "#065F46" : "#991B1B" }}>
      {feasible
        ? `Réalisable : vise environ ${money(goalMonthly, currency)}/mois (soit ${money(extra, currency)} de plus qu'aujourd'hui). Il te resterait ${money(disponible - extra, currency)}/mois de marge.`
        : `Serré : il faudrait ${money(extra, currency)}/mois de plus que ta marge actuelle (${money(disponible, currency)}/mois). Tu pourrais décaler l'objectif, réduire une charge ailleurs (abonnement, projet en pause…), ou répartir l'effort différemment.`}
      {d.interestRate ? <span className="block mt-1 opacity-75">Inclut environ {money(monthlyInterestOnly, currency)}/mois d'intérêts à {d.interestRate}%.</span> : null}
    </div>
  );
}

function DebtsTab({ theme, state, setState, onGoToAide }) {
  const lang = state.language || "fr";
  const [payInput, setPayInput] = useState({});
  const [goalInput, setGoalInput] = useState({});
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [celebratingDebt, setCelebratingDebt] = useState(null);

  const totalDebtRemaining = (debts) => debts.reduce((a, d) => a + (d.amount - d.paid), 0);

  const addDebtItem = (item) => setState((s) => {
    const newDebts = [...s.debts, { id: uid(), ...item }];
    return { ...s, debts: newDebts, debtsHistory: pushHistoryPoint(s.debtsHistory, totalDebtRemaining(newDebts)) };
  });
  const saveDebtItem = (id, fields) => {
    setState((s) => {
      const newDebts = s.debts.map((d) => (d.id === id ? { ...d, ...fields } : d));
      return { ...s, debts: newDebts, debtsHistory: pushHistoryPoint(s.debtsHistory, totalDebtRemaining(newDebts)) };
    });
    setEditingDebt(null);
  };

  const removeDebt = (id) => setState((s) => {
    const newDebts = s.debts.filter((d) => d.id !== id);
    return { ...s, debts: newDebts, debtsHistory: pushHistoryPoint(s.debtsHistory, totalDebtRemaining(newDebts)) };
  });

  const registerPayment = (id) => {
    const amt = Number(payInput[id]);
    if (!amt) return;
    setState((s) => {
      const newDebts = s.debts.map((d) => {
        if (d.id !== id) return d;
        const newPaid = Math.min(d.amount, d.paid + amt);
        if (d.paid < d.amount && newPaid >= d.amount) {
          setCelebratingDebt(d);
        }
        return { ...d, paid: newPaid };
      });
      return { ...s, debts: newDebts, debtsHistory: pushHistoryPoint(s.debtsHistory, totalDebtRemaining(newDebts)) };
    });
    setPayInput((p) => ({ ...p, [id]: "" }));
  };

  const setGoal = (id) => {
    const val = Number(goalInput[id]);
    if (!val) return;
    setState((s) => ({ ...s, debts: s.debts.map((d) => d.id === id ? { ...d, goalMonths: val } : d) }));
  };

  const filteredDebts = HAS_OWNERS.includes(state.profileType) && ownerFilter !== "all"
    ? state.debts.filter((d) => d.owner === ownerFilter)
    : state.debts;
  const totalRemaining = filteredDebts.reduce((a, d) => a + (d.amount - d.paid), 0);

  const cashflow = useMemo(() => {
    const byOwner = (arr) => (HAS_OWNERS.includes(state.profileType) && ownerFilter !== "all" ? arr.filter((x) => x.owner === ownerFilter) : arr);
    const income = byOwner(state.paydays).reduce((a, p) => a + monthlyEquivalent(p.amount, p.frequency), 0);
    const billsM = byOwner(state.bills).reduce((a, b) => a + monthlyEquivalent(b.amount, b.period), 0);
    const subsM = byOwner(state.subscriptions).reduce((a, s) => a + monthlyEquivalent(s.amount, s.period), 0);
    const debtsM = byOwner(state.debts).reduce((a, d) => a + monthlyEquivalent(debtInstallment(d), d.frequency), 0);
    const projectsM = byOwner(state.projects).reduce((a, p) => a + monthlyEquivalent(projectInstallment(p), p.frequency), 0);
    const charges = billsM + subsM + debtsM + projectsM;
    return { income, charges, disponible: income - charges };
  }, [state, ownerFilter]);

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold" style={{ color: theme.text }}>{t(lang, "tabDebts")}</h2>
          <p className="text-xs text-slate-400">{t(lang, "remainingToRepay")} : {money(totalRemaining, state.currency)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onGoToAide} className="p-2 rounded-lg" style={{ backgroundColor: theme.soft }}>
            <Lightbulb size={18} style={{ color: theme.primary }} />
          </button>
          <button onClick={() => setShowAddDebt(true)} className="p-2 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      <OwnerFilterBar theme={theme} state={state} value={ownerFilter} onChange={setOwnerFilter} />

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-medium mb-2">Aperçu mensuel</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-slate-400">Revenus</p>
            <p className="text-sm font-semibold" style={{ color: "#2E9E5B" }}>{money(cashflow.income, state.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Charges</p>
            <p className="text-sm font-semibold" style={{ color: theme.danger }}>{money(cashflow.charges, state.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Disponible</p>
            <p className="text-sm font-semibold" style={{ color: cashflow.disponible >= 0 ? theme.primary : theme.danger }}>{money(cashflow.disponible, state.currency)}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          {HAS_OWNERS.includes(state.profileType) ? "Calculé selon le filtre sélectionné ci-dessus." : "Calculé à partir de tes paies, factures, abonnements, dettes et projets."}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-medium mb-1" style={{ color: theme.text }}>{t(lang, "debtTrendTitle")}</h3>
        {(state.debtsHistory || []).length >= 2 ? (
          <div className="h-32 -ml-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={state.debtsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <Tooltip formatter={(v) => money(v, state.currency)} />
                <Line type="monotone" dataKey="total" stroke={theme.danger} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-1">{t(lang, "debtTrendEmpty")}</p>
        )}
      </div>

      {filteredDebts.length === 0 && (
        <p className="text-sm text-slate-400 text-center mt-10">Aucune dette dans cette catégorie.</p>
      )}

      <div className="space-y-3">
        {filteredDebts.map((d) => {
          const remaining = d.amount - d.paid;
          const pct = d.amount ? (d.paid / d.amount) * 100 : 0;
          const currentInstallment = debtInstallment(d);
          const interestOnly = d.paymentMode === "recurrent" ? interestOnlyPayment(remaining, d.interestRate, d.frequency) : 0;
          const barelyCoversInterest = d.interestRate && d.paymentMode === "recurrent" && currentInstallment > 0 && currentInstallment <= interestOnly * 1.05;
          return (
            <div key={d.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-start mb-2 gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <IconAvatar icon={d.icon || DEBT_ICONS[0]} color={theme.primary} />
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="break-words">{d.title}</span> <OwnerBadge ownerId={d.owner} state={state} />
                      {d.interestRate != null && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.danger}1A`, color: theme.danger }}>
                          {d.interestRate}% /an
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {d.paymentMode === "unique"
                        ? `Échéance : ${d.dueDate}`
                        : `~${money(currentInstallment, state.currency)} / ${freqLabel(d.frequency)} · jusqu'au ${d.endDate}`}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditingDebt(d)} className="text-slate-300 hover:text-slate-600 p-1"><Pencil size={15} /></button>
                  <ConfirmDeleteButton onConfirm={() => removeDebt(d.id)} />
                </span>
              </div>
              {barelyCoversInterest && (
                <p className="text-[11px] mb-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: "#FEF2F2", color: "#991B1B" }}>
                  ⚠️ Ce versement couvre à peine les intérêts (~{money(interestOnly, state.currency)} / {freqLabel(d.frequency)}) — le capital diminue très lentement à ce rythme.
                </p>
              )}
              <ProgressBar value={pct} color={theme.primary} />
              <div className="flex justify-between text-xs mt-1.5 text-slate-500">
                <span>{money(d.paid, state.currency)} remboursé</span>
                <span>{money(remaining, state.currency)} restant</span>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  placeholder="Montant"
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={payInput[d.id] || ""}
                  onChange={(e) => setPayInput((p) => ({ ...p, [d.id]: e.target.value }))}
                />
                <button
                  onClick={() => registerPayment(d.id)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  Paiement
                </button>
              </div>

              {d.paymentMode === "recurrent" && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-600 mb-1.5">🎯 Rembourser plus vite ?</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Rembourser en (mois)"
                      className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={goalInput[d.id] ?? (d.goalMonths || "")}
                      onChange={(e) => setGoalInput((v) => ({ ...v, [d.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => setGoal(d.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border"
                      style={{ borderColor: theme.primary, color: theme.primary }}
                    >
                      Calculer
                    </button>
                  </div>
                  {d.goalMonths ? (
                    <GoalResult d={d} goalMonths={d.goalMonths} disponible={cashflow.disponible} theme={theme} currency={state.currency} />
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddDebt && (
        <BottomSheet title="Ajouter une dette" onClose={() => setShowAddDebt(false)}>
          <DebtsStep theme={theme} state={state} items={state.debts} onAdd={addDebtItem} onRemove={(id) => setState((s) => ({ ...s, debts: s.debts.filter((d) => d.id !== id) }))} />
        </BottomSheet>
      )}

      {editingDebt && (
        <BottomSheet title="Modifier la dette" onClose={() => setEditingDebt(null)}>
          <DebtsStep theme={theme} state={state} items={state.debts} editItem={editingDebt} onSave={saveDebtItem} onAdd={() => {}} onRemove={() => {}} hideList />
        </BottomSheet>
      )}

      {celebratingDebt && (
        <CelebrationOverlay
          theme={theme}
          icon={celebratingDebt.icon || DEBT_ICONS[0]}
          title={t(lang, "debtPaidOffTitle")}
          message={t(lang, "debtPaidOffMessage").replace("{title}", celebratingDebt.title).replace("{amount}", money(celebratingDebt.amount, state.currency))}
          onClose={() => setCelebratingDebt(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projets (enveloppes)
// ---------------------------------------------------------------------------
function ProjectsTab({ theme, state, setState }) {
  const lang = state.language || "fr";
  const [filter, setFilter] = useState("tous");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [saveInput, setSaveInput] = useState({});
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [celebratingProject, setCelebratingProject] = useState(null);

  const totalProjectSaved = (projects) => projects.reduce((a, p) => a + p.saved, 0);

  const addProjectItem = (item) => setState((s) => {
    const newProjects = [...s.projects, { id: uid(), ...item }];
    return { ...s, projects: newProjects, projectsHistory: pushHistoryPoint(s.projectsHistory, totalProjectSaved(newProjects)) };
  });
  const saveProjectItem = (id, fields) => {
    setState((s) => {
      const newProjects = s.projects.map((p) => (p.id === id ? { ...p, ...fields } : p));
      return { ...s, projects: newProjects, projectsHistory: pushHistoryPoint(s.projectsHistory, totalProjectSaved(newProjects)) };
    });
    setEditingProject(null);
  };

  const removeProject = (id) => setState((s) => {
    const newProjects = s.projects.filter((p) => p.id !== id);
    return { ...s, projects: newProjects, projectsHistory: pushHistoryPoint(s.projectsHistory, totalProjectSaved(newProjects)) };
  });

  const registerSaving = (id) => {
    const amt = Number(saveInput[id]);
    if (!amt) return;
    setState((s) => {
      const newProjects = s.projects.map((p) => {
        if (p.id !== id) return p;
        const newSaved = Math.min(p.target, p.saved + amt);
        if (p.saved < p.target && newSaved >= p.target) {
          setCelebratingProject(p);
        }
        return { ...p, saved: newSaved };
      });
      return { ...s, projects: newProjects, projectsHistory: pushHistoryPoint(s.projectsHistory, totalProjectSaved(newProjects)) };
    });
    setSaveInput((v) => ({ ...v, [id]: "" }));
  };

  const byTerm = filter === "tous" ? state.projects : state.projects.filter((p) => p.term === filter);
  const filtered = HAS_OWNERS.includes(state.profileType) && ownerFilter !== "all"
    ? byTerm.filter((p) => p.owner === ownerFilter)
    : byTerm;

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold" style={{ color: theme.text }}>{t(lang, "tabProjects")}</h2>
        <button onClick={() => setShowAddProject(true)} className="p-2 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>
          <Plus size={18} />
        </button>
      </div>

      <OwnerFilterBar theme={theme} state={state} value={ownerFilter} onChange={setOwnerFilter} />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[{ id: "tous", label: "Tous" }, ...TERMES].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{
              backgroundColor: filter === t.id ? theme.primary : "white",
              color: filter === t.id ? "white" : "#64748b",
              border: `1px solid ${filter === t.id ? theme.primary : "#e2e8f0"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-medium mb-1" style={{ color: theme.text }}>{t(lang, "projectTrendTitle")}</h3>
        {(state.projectsHistory || []).length >= 2 ? (
          <div className="h-32 -ml-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={state.projectsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <Tooltip formatter={(v) => money(v, state.currency)} />
                <Line type="monotone" dataKey="total" stroke={theme.accent} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-1">{t(lang, "projectTrendEmpty")}</p>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-400 text-center mt-10">Aucun projet dans cette catégorie.</p>
      )}

      <div className="space-y-3">
        {filtered.map((p) => {
          const pct = p.target ? (p.saved / p.target) * 100 : 0;
          const termInfo = TERMES.find((t) => t.id === p.term);
          return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-start mb-2 gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <IconAvatar icon={p.icon || PROJECT_ICONS[0]} color={theme.accent} />
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="break-words">{p.title}</span> <OwnerBadge ownerId={p.owner} state={state} />
                    </h3>
                    <p className="text-xs text-slate-400">
                      {termInfo?.label || p.term} · ~{money(projectInstallment(p), state.currency)} / {freqLabel(p.frequency)} · jusqu'au {p.endDate}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditingProject(p)} className="text-slate-300 hover:text-slate-600 p-1"><Pencil size={15} /></button>
                  <ConfirmDeleteButton onConfirm={() => removeProject(p.id)} />
                </span>
              </div>
              <ProgressBar value={pct} color={theme.accent} />
              <div className="flex justify-between text-xs mt-1.5 text-slate-500">
                <span>{money(p.saved, state.currency)} {t(lang, "savedWord")}</span>
                <span>{t(lang, "goalWord")} {money(p.target, state.currency)}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  placeholder="Montant"
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={saveInput[p.id] || ""}
                  onChange={(e) => setSaveInput((v) => ({ ...v, [p.id]: e.target.value }))}
                />
                <button
                  onClick={() => registerSaving(p.id)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: theme.secondary }}
                >
                  Épargner
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddProject && (
        <BottomSheet title="Ajouter un projet" onClose={() => setShowAddProject(false)}>
          <ProjectsStep theme={theme} state={state} items={state.projects} onAdd={addProjectItem} onRemove={(id) => setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }))} />
        </BottomSheet>
      )}

      {editingProject && (
        <BottomSheet title="Modifier le projet" onClose={() => setEditingProject(null)}>
          <ProjectsStep theme={theme} state={state} items={state.projects} editItem={editingProject} onSave={saveProjectItem} onAdd={() => {}} onRemove={() => {}} hideList />
        </BottomSheet>
      )}

      {celebratingProject && (
        <CelebrationOverlay
          theme={theme}
          icon={celebratingProject.icon || PROJECT_ICONS[0]}
          title={t(lang, "goalReachedTitle")}
          message={t(lang, "goalReachedMessage").replace("{title}", celebratingProject.title).replace("{amount}", money(celebratingProject.target, state.currency))}
          onClose={() => setCelebratingProject(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Investissements (+ Comptes enfants)
// ---------------------------------------------------------------------------
function InvestmentsTab({ theme, state, setState }) {
  const lang = state.language || "fr";
  const [updateInput, setUpdateInput] = useState({});
  const [childUpdateInput, setChildUpdateInput] = useState({});
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [showAddChildAccount, setShowAddChildAccount] = useState(false);
  const [newChildAccount, setNewChildAccount] = useState({ childId: "", title: "REEE", balance: "" });
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const addInvestmentItem = (item) => setState((s) => ({ ...s, investments: [...s.investments, { id: uid(), ...item }] }));
  const saveInvestmentItem = (id, fields) => {
    setState((s) => ({ ...s, investments: s.investments.map((i) => (i.id === id ? { ...i, ...fields } : i)) }));
    setEditingInvestment(null);
  };

  const removeInvestment = (id) => setState((s) => ({ ...s, investments: s.investments.filter((i) => i.id !== id) }));

  const updateValue = (id) => {
    const val = Number(updateInput[id]);
    if (!val && val !== 0) return;
    setState((s) => ({
      ...s,
      investments: s.investments.map((inv) =>
        inv.id === id
          ? { ...inv, value: val, history: [...inv.history, { date: today, value: val }] }
          : inv
      ),
    }));
    setUpdateInput((v) => ({ ...v, [id]: "" }));
  };

  const openAddChildAccount = () => {
    setNewChildAccount({ childId: state.children[0]?.id || "", title: "REEE", balance: "" });
    setShowAddChildAccount(true);
  };

  const submitChildAccount = () => {
    if (!newChildAccount.childId) return;
    const balance = Number(newChildAccount.balance) || 0;
    setState((s) => ({
      ...s,
      children: s.children.map((c) =>
        c.id === newChildAccount.childId
          ? { ...c, account: { title: newChildAccount.title || "REEE", balance, history: [{ date: today, value: balance }] } }
          : c
      ),
    }));
    setShowAddChildAccount(false);
  };

  const updateChildValue = (childId) => {
    const val = Number(childUpdateInput[childId]);
    if (!val && val !== 0) return;
    setState((s) => ({
      ...s,
      children: s.children.map((c) =>
        c.id === childId && c.account
          ? { ...c, account: { ...c.account, balance: val, history: [...c.account.history, { date: today, value: val }] } }
          : c
      ),
    }));
    setChildUpdateInput((v) => ({ ...v, [childId]: "" }));
  };

  const filteredInvestments = HAS_OWNERS.includes(state.profileType) && ownerFilter !== "all"
    ? state.investments.filter((i) => i.owner === ownerFilter)
    : state.investments;
  const visibleInvestments = useMemo(() => {
    let list = filteredInvestments;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
    }
    if (sortBy === "az") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "value") list = [...list].sort((a, b) => b.value - a.value);
    return list;
  }, [filteredInvestments, search, sortBy]);
  const total = filteredInvestments.reduce((a, i) => a + i.value, 0);
  const childrenWithAccounts = state.children.filter((c) => c.account);

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold" style={{ color: theme.text }}>{t(lang, "investmentsTitle")}</h2>
          <p className="text-xs text-slate-400">Total : {money(total, state.currency)}</p>
        </div>
        <button onClick={() => setShowAddInvestment(true)} className="p-2 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>
          <Plus size={18} />
        </button>
      </div>

      <OwnerFilterBar theme={theme} state={state} value={ownerFilter} onChange={setOwnerFilter} />

      {filteredInvestments.length > 3 && (
        <div className="mb-3 space-y-2">
          <input
            className={inputCls}
            placeholder="Rechercher un investissement…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            {[{ id: "recent", label: "Récent" }, { id: "az", label: "A-Z" }, { id: "value", label: "Valeur" }].map((o) => (
              <button
                key={o.id}
                onClick={() => setSortBy(o.id)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: sortBy === o.id ? theme.primary : "white",
                  color: sortBy === o.id ? "white" : "#64748b",
                  border: `1px solid ${sortBy === o.id ? theme.primary : "#e2e8f0"}`,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredInvestments.length === 0 && (
        <p className="text-sm text-slate-400 text-center mt-6">Aucun investissement dans cette catégorie.</p>
      )}
      {filteredInvestments.length > 0 && visibleInvestments.length === 0 && (
        <p className="text-sm text-slate-400 text-center mt-6">Aucun résultat pour « {search} ».</p>
      )}

      <div className="space-y-3">
        {visibleInvestments.map((inv) => (
          <div key={inv.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="break-words">{inv.title}</span> <OwnerBadge ownerId={inv.owner} state={state} />
                </h3>
                <p className="text-xs text-slate-400">{inv.type}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm" style={{ color: theme.primary }}>{money(inv.value, state.currency)}</p>
                <span className="flex items-center gap-1 mt-1">
                  <button onClick={() => setEditingInvestment(inv)} className="text-slate-300 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                  <ConfirmDeleteButton onConfirm={() => removeInvestment(inv.id)} size={14} />
                </span>
              </div>
            </div>

            {inv.history.length >= 2 ? (
              <div className="h-28 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={inv.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 9 }} width={40} />
                    <Tooltip formatter={(v) => money(v, state.currency)} labelFormatter={(l) => l} />
                    <Line type="monotone" dataKey="value" stroke={theme.secondary} strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Ajoute une nouvelle valeur pour voir l'évolution.</p>
            )}

            <div className="flex gap-2 mt-3">
              <input
                type="number"
                placeholder="Nouvelle valeur"
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={updateInput[inv.id] || ""}
                onChange={(e) => setUpdateInput((v) => ({ ...v, [inv.id]: e.target.value }))}
              />
              <button
                onClick={() => updateValue(inv.id)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Mettre à jour
              </button>
            </div>
          </div>
        ))}
      </div>

      {state.profileType === "parent" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm" style={{ color: theme.text }}>Comptes enfants</h2>
            <button
              onClick={openAddChildAccount}
              disabled={state.children.length === 0}
              className="p-1.5 rounded-lg text-white disabled:opacity-40"
              style={{ backgroundColor: theme.secondary }}
            >
              <Plus size={16} />
            </button>
          </div>
          {state.children.length === 0 && (
            <p className="text-sm text-slate-400 text-center mt-2">Ajoute d'abord un enfant dans les réglages.</p>
          )}
          {state.children.length > 0 && childrenWithAccounts.length === 0 && (
            <p className="text-sm text-slate-400 text-center mt-2">Aucun compte enfant. Ajoute-en un pour suivre un REEE par exemple.</p>
          )}
          <div className="space-y-3">
            {childrenWithAccounts.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-sm">{c.account.title} — {c.name}</h3>
                    <p className="text-xs text-slate-400">Compte enfant</p>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: theme.secondary }}>{money(c.account.balance, state.currency)}</p>
                </div>
                {c.account.history.length >= 2 ? (
                  <div className="h-24 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={c.account.history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis tick={{ fontSize: 9 }} width={40} />
                        <Tooltip formatter={(v) => money(v, state.currency)} />
                        <Line type="monotone" dataKey="value" stroke={theme.primary} strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Ajoute une nouvelle valeur pour voir l'évolution.</p>
                )}
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    placeholder="Nouveau solde"
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    value={childUpdateInput[c.id] || ""}
                    onChange={(e) => setChildUpdateInput((v) => ({ ...v, [c.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => updateChildValue(c.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Mettre à jour
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddInvestment && (
        <BottomSheet title="Ajouter un investissement" onClose={() => setShowAddInvestment(false)}>
          <InvestmentsStep theme={theme} state={state} items={state.investments} onAdd={addInvestmentItem} onRemove={(id) => setState((s) => ({ ...s, investments: s.investments.filter((i) => i.id !== id) }))} />
        </BottomSheet>
      )}

      {editingInvestment && (
        <BottomSheet title="Modifier l'investissement" onClose={() => setEditingInvestment(null)}>
          <InvestmentsStep theme={theme} state={state} items={state.investments} editItem={editingInvestment} onSave={saveInvestmentItem} onAdd={() => {}} onRemove={() => {}} hideList />
        </BottomSheet>
      )}

      {showAddChildAccount && (
        <BottomSheet title="Ajouter un compte enfant" onClose={() => setShowAddChildAccount(false)}>
          <Field label="Enfant">
            <select
              className={selectCls}
              value={newChildAccount.childId}
              onChange={(e) => setNewChildAccount((v) => ({ ...v, childId: e.target.value }))}
            >
              {state.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Nom du compte">
            <input className={inputCls} value={newChildAccount.title} onChange={(e) => setNewChildAccount((v) => ({ ...v, title: e.target.value }))} />
          </Field>
          <Field label={`Solde actuel (${state.currency})`}>
            <input type="number" className={inputCls} value={newChildAccount.balance} onChange={(e) => setNewChildAccount((v) => ({ ...v, balance: e.target.value }))} />
          </Field>
          <button
            onClick={submitChildAccount}
            disabled={!newChildAccount.childId}
            className="mt-1 flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg border disabled:opacity-40"
            style={{ borderColor: theme.primary, color: theme.primary }}
          >
            <Plus size={16} /> Ajouter
          </button>
        </BottomSheet>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------
function SettingsPanel({ theme, state, setState, onClose, onReset }) {
  const lang = state.language || "fr";
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showAddPayday, setShowAddPayday] = useState(false);
  const [editingPayday, setEditingPayday] = useState(null);
  const [showAddAidant, setShowAddAidant] = useState(false);
  const [showAddAutre, setShowAddAutre] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const addChildItem = (item) => setState((s) => ({ ...s, children: [...s.children, { id: uid(), ...item }] }));
  const removeChild = (id) => setState((s) => ({ ...s, children: s.children.filter((c) => c.id !== id) }));
  const addPaydayItem = (item) => setState((s) => ({ ...s, paydays: [...s.paydays, { id: uid(), ...item }] }));
  const savePaydayItem = (id, fields) => {
    setState((s) => ({ ...s, paydays: s.paydays.map((p) => (p.id === id ? { ...p, ...fields } : p)) }));
    setShowAddPayday(false);
    setEditingPayday(null);
  };
  const removePayday = (id) => setState((s) => ({ ...s, paydays: s.paydays.filter((p) => p.id !== id) }));
  const addAidantItem = (item) => setState((s) => ({ ...s, people: [...s.people, { id: uid(), ...item }] }));
  const removeAidantItem = (id) => setState((s) => ({ ...s, people: s.people.filter((p) => p.id !== id) }));

  return (
    <div className="fixed inset-0 bg-black/30 z-50 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }} onClick={onClose}>
      <div className="min-h-full flex items-end">
      <div className="bg-white w-full rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-semibold flex items-center gap-2"><Settings size={18} /> {t(lang, "settings")}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-5 pb-10">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Palette size={15} /> {t(lang, "themeTitle")}</h3>
        <div className="mb-6">
          <ThemeStep
            themeId={state.themeId}
            onPick={(id) => setState((s) => ({ ...s, themeId: id }))}
            customColor={state.customColor}
            customSecondary={state.customSecondary}
            customAccent={state.customAccent}
            onChangeCustom={(field, value) => setState((s) => ({ ...s, [field]: value }))}
            hideHeading
            lang={lang}
          />
        </div>

        <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Languages size={15} /> {t(lang, "languageTitle")}</h3>
        <select
          className={selectCls + " mb-6"}
          value={lang}
          onChange={(e) => setState((s) => ({ ...s, language: e.target.value }))}
        >
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>

        <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Coins size={15} /> {t(lang, "currencyLabel")}</h3>
        <select
          className={selectCls + " mb-6"}
          value={state.currency}
          onChange={(e) => setState((s) => ({ ...s, currency: e.target.value }))}
        >
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>

        <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Wallet size={15} /> {t(lang, "settingsIncome")}</h3>
        <ul className="space-y-2 mb-3">
          {state.paydays.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
              <span className="min-w-0 break-words">{p.title} — {money(p.amount, state.currency)} ({p.frequency})</span>
              <span className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditingPayday(p); setShowAddPayday(true); }} className="text-slate-400 hover:text-slate-700 p-1"><Pencil size={14} /></button>
                <ConfirmDeleteButton onConfirm={() => removePayday(p.id)} />
              </span>
            </li>
          ))}
          {state.paydays.length === 0 && <p className="text-sm text-slate-400">{t(lang, "noIncome")}</p>}
        </ul>
        <button onClick={() => { setEditingPayday(null); setShowAddPayday(true); }} className="text-sm font-medium px-3 py-2 rounded-lg border mb-6" style={{ borderColor: theme.primary, color: theme.primary }}>
          + {t(lang, "addIncome")}
        </button>

        {state.profileType === "couple" && (
          <>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Heart size={15} /> {t(lang, "settingsHousehold")}</h3>
            <div className="space-y-2 mb-6">
              {state.people.map((p, idx) => (
                <div key={p.id} className="p-2 rounded-lg bg-slate-50">
                  <input
                    className={inputCls}
                    value={p.label}
                    onChange={(e) => setState((s) => ({ ...s, people: s.people.map((x, i) => i === idx ? { ...x, label: e.target.value } : x) }))}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {state.profileType === "parent" && (
          <>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Users size={15} /> {t(lang, "settingsParents")}</h3>
            <div className="mb-6">
              <ParentsStep
                theme={theme}
                state={state}
                people={state.people}
                onChange={(people) => setState((s) => ({ ...s, people }))}
                hideHeading
              />
            </div>
          </>
        )}

        {state.profileType === "parent" && (
          <>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Baby size={15} /> {t(lang, "settingsChildren")}</h3>
            <ul className="space-y-2 mb-3">
              {state.children.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">{c.name}{c.age ? ` (${c.age} ans)` : ""}{c.account ? ` — ${c.account.title} : ${money(c.account.balance, state.currency)}` : ""}</span>
                  <span className="shrink-0"><ConfirmDeleteButton onConfirm={() => removeChild(c.id)} /></span>
                </li>
              ))}
            </ul>
            <button onClick={() => setShowAddChild(true)} className="text-sm font-medium px-3 py-2 rounded-lg border mb-6" style={{ borderColor: theme.primary, color: theme.primary }}>
              + {t(lang, "addChild")}
            </button>
          </>
        )}

        {state.profileType === "aidant" && (
          <>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><HeartHandshake size={15} /> {t(lang, "settingsAidant")}</h3>
            <ul className="space-y-2 mb-3">
              {state.people.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">{p.label} — {p.relation}</span>
                  <span className="shrink-0"><ConfirmDeleteButton onConfirm={() => removeAidantItem(p.id)} /></span>
                </li>
              ))}
              {state.people.length === 0 && <p className="text-sm text-slate-400">Aucune personne ajoutée.</p>}
            </ul>
            <button onClick={() => setShowAddAidant(true)} className="text-sm font-medium px-3 py-2 rounded-lg border mb-6" style={{ borderColor: theme.primary, color: theme.primary }}>
              + {t(lang, "addAidantPerson")}
            </button>
          </>
        )}

        {state.profileType === "autre" && (
          <>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Users size={15} /> {t(lang, "settingsPeople")}</h3>
            <ul className="space-y-2 mb-3">
              {state.people.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">{p.label}{p.note ? ` — ${p.note}` : ""}</span>
                  <span className="shrink-0"><ConfirmDeleteButton onConfirm={() => removeAidantItem(p.id)} /></span>
                </li>
              ))}
              {state.people.length === 0 && <p className="text-sm text-slate-400">Aucune personne ajoutée.</p>}
            </ul>
            <button onClick={() => setShowAddAutre(true)} className="text-sm font-medium px-3 py-2 rounded-lg border mb-6" style={{ borderColor: theme.primary, color: theme.primary }}>
              + {t(lang, "addPerson")}
            </button>
          </>
        )}

        <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Download size={15} /> {t(lang, "yourDataTitle")}</h3>
        <p className="text-xs text-slate-400 mb-3">
          {t(lang, "yourDataHint")}
        </p>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => exportAsCSV(state)}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border"
            style={{ borderColor: theme.primary, color: theme.primary }}
          >
            <Download size={14} /> {t(lang, "exportCSV")}
          </button>
          <button
            onClick={() => exportAsJSON(state)}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border"
            style={{ borderColor: theme.primary, color: theme.primary }}
          >
            <Download size={14} /> {t(lang, "exportBackup")}
          </button>
        </div>
        <button
          onClick={() => printSummary(state)}
          className="w-full flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border mb-6"
          style={{ borderColor: theme.primary, color: theme.primary }}
        >
          <Printer size={14} /> {t(lang, "exportPrint")}
        </button>

        <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><ShieldCheck size={15} /> {t(lang, "comingSoonTitle")}</h3>
        <div className="p-3 rounded-lg bg-slate-50 mb-6">
          <p className="text-xs text-slate-500 leading-relaxed">
            {t(lang, "comingSoonText")}
          </p>
        </div>

        <button
          onClick={() => setShowPrivacyPolicy(true)}
          className="w-full flex items-center justify-between text-sm px-3 py-2.5 rounded-lg border border-slate-200 mb-6"
        >
          <span className="flex items-center gap-2 text-slate-600"><ShieldCheck size={15} /> {t(lang, "privacyPolicy")}</span>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        {confirmingReset ? (
          <div className="border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600 mb-3">Toutes les données seront supprimées et l'inscription recommencera. Confirmer ?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmingReset(false)} className="flex-1 text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 text-slate-600">
                Annuler
              </button>
              <button onClick={onReset} className="flex-1 text-sm font-medium px-3 py-2 rounded-lg bg-red-500 text-white">
                Confirmer
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            className="w-full text-sm text-red-500 border border-red-200 rounded-lg py-2"
          >
            {t(lang, "resetAllData")}
          </button>
        )}

        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full text-sm text-slate-500 border border-slate-200 rounded-lg py-2 mt-2"
        >
          Se déconnecter
        </button>
        </div>
      </div>
      </div>

      {showPrivacyPolicy && (
        <BottomSheet title={t(lang, "privacyPolicy")} onClose={() => setShowPrivacyPolicy(false)}>
          <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{t(lang, "privacyPolicyBody")}</p>
          <button
            onClick={() => setShowPrivacyPolicy(false)}
            className="w-full mt-5 text-sm font-medium text-white px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: theme.primary }}
          >
            {t(lang, "privacyPolicyClose")}
          </button>
        </BottomSheet>
      )}

      {showAddChild && (
        <BottomSheet title={t(lang, "addChild")} onClose={() => setShowAddChild(false)}>
          <ChildrenStep theme={theme} state={state} items={state.children} onAdd={addChildItem} onRemove={removeChild} />
        </BottomSheet>
      )}

      {showAddPayday && (
        <BottomSheet title={editingPayday ? t(lang, "editIncome") : t(lang, "addIncome")} onClose={() => { setShowAddPayday(false); setEditingPayday(null); }}>
          <PaydaysStep theme={theme} state={state} items={state.paydays} editItem={editingPayday} onAdd={addPaydayItem} onSave={savePaydayItem} onRemove={removePayday} hideList />
        </BottomSheet>
      )}

      {showAddAidant && (
        <BottomSheet title={t(lang, "addAidantPerson")} onClose={() => setShowAddAidant(false)}>
          <AidantStep theme={theme} state={state} items={state.people} onAdd={addAidantItem} onRemove={removeAidantItem} />
        </BottomSheet>
      )}

      {showAddAutre && (
        <BottomSheet title="Ajouter une personne" onClose={() => setShowAddAutre(false)}>
          <AutreStep theme={theme} state={state} items={state.people} onAdd={addAidantItem} onRemove={removeAidantItem} />
        </BottomSheet>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aide & Conseils
// ---------------------------------------------------------------------------
function AllocationRow({ label, actualPct, targetPct, color, lang }) {
  const diff = actualPct - targetPct;
  const verdict = Math.abs(diff) < 4
    ? t(lang, "wellBalanced")
    : diff > 0
    ? t(lang, "aboveTarget").replace("{n}", Math.round(diff))
    : t(lang, "belowTarget").replace("{n}", Math.round(-diff));
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="text-slate-400">{Math.round(actualPct)}% ({t(lang, "targetSuffix").replace("{pct}", targetPct)})</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden relative">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, actualPct)}%`, backgroundColor: color }} />
        <div className="absolute top-0 h-2.5 border-r-2 border-slate-500" style={{ left: `${targetPct}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{verdict}</p>
    </div>
  );
}

function EnvelopeMiniRow({ title, pct, color, sub }) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{title}</span>
        <span className="text-slate-400">{sub}</span>
      </div>
      <ProgressBar value={pct} color={color} />
    </div>
  );
}

function AideTab({ theme, state }) {
  const lang = state.language || "fr";
  const monthlyIncome = state.paydays.reduce((a, p) => a + monthlyEquivalent(p.amount, p.frequency), 0);
  const needsMonthly =
    state.bills.reduce((a, b) => a + monthlyEquivalent(b.amount, b.period), 0) +
    state.debts.reduce((a, d) => a + monthlyEquivalent(debtInstallment(d), d.frequency), 0);
  const wantsMonthly = state.subscriptions.reduce((a, s) => a + monthlyEquivalent(s.amount, s.period), 0);
  const savingsMonthly = state.projects.reduce((a, p) => a + monthlyEquivalent(projectInstallment(p), p.frequency), 0);
  const totalOut = needsMonthly + wantsMonthly + savingsMonthly;

  const pct = (v) => (monthlyIncome > 0 ? (v / monthlyIncome) * 100 : 0);

  const sortedSubs = [...state.subscriptions].sort((a, b) => monthlyEquivalent(b.amount, b.period) - monthlyEquivalent(a.amount, a.period));
  const topSub = sortedSubs[0];

  const [selectedMethod, setSelectedMethod] = useState("50-30-20");

  const methods = [
    { id: "50-30-20", title: t(lang, "method502030Title"), text: t(lang, "method502030Text") },
    { id: "enveloppes", title: t(lang, "methodEnvelopesTitle"), text: t(lang, "methodEnvelopesText") },
    { id: "payer-premier", title: t(lang, "methodPayFirstTitle"), text: t(lang, "methodPayFirstText") },
  ];

  const envelopes = [
    ...state.debts.map((d) => ({ id: d.id, title: d.title, pct: d.amount ? (d.paid / d.amount) * 100 : 0, sub: `${money(d.amount - d.paid, state.currency)} ${t(lang, "remainingWord")}`, color: theme.primary })),
    ...state.projects.map((p) => ({ id: p.id, title: p.title, pct: p.target ? (p.saved / p.target) * 100 : 0, sub: `${money(p.saved, state.currency)} / ${money(p.target, state.currency)}`, color: theme.accent })),
  ];

  const restMonthly = monthlyIncome - savingsMonthly;

  return (
    <div className="p-4 pb-24">
      <h2 className="font-semibold mb-1" style={{ color: theme.text }}>{t(lang, "aideTitle")}</h2>
      <p className="text-xs text-slate-400 mb-1">{t(lang, "aideSubtitle")}</p>
      <p className="text-[11px] text-slate-400 mb-4 leading-relaxed p-2 rounded-lg bg-slate-50 border border-slate-100">
        {t(lang, "aideDisclaimer")}
      </p>

      {sortedSubs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Lightbulb size={15} /> {t(lang, "aideSavingsSpotted")}</h3>
          {topSub && (
            <p className="text-xs mb-3 p-2 rounded-lg" style={{ backgroundColor: theme.soft, color: theme.text }}>
              {t(lang, "aideCancelHint").replace("{title}", topSub.title).replace("{amount}", money(monthlyEquivalent(topSub.amount, topSub.period), state.currency))}
            </p>
          )}
          <ul className="space-y-1.5">
            {sortedSubs.map((s) => (
              <li key={s.id} className="flex justify-between text-sm">
                <span className="text-slate-600">{s.title}</span>
                <span className="text-slate-400">{money(monthlyEquivalent(s.amount, s.period), state.currency)}{t(lang, "perMonth")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><PiggyBank size={15} /> {t(lang, "aideMethodsTitle")}</h3>
        <div className="space-y-2 mb-4">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMethod(m.id)}
              className="w-full text-left p-3 rounded-lg border-2 transition"
              style={{
                borderColor: selectedMethod === m.id ? theme.primary : "transparent",
                backgroundColor: selectedMethod === m.id ? theme.soft : "#F8FAFC",
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: selectedMethod === m.id ? theme.text : "#334155" }}>{m.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{m.text}</p>
            </button>
          ))}
        </div>

        {monthlyIncome === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{t(lang, "aideNoIncome")}</p>
        ) : (
          <div className="border-t border-slate-100 pt-4">
            {selectedMethod === "50-30-20" && (
              <>
                <p className="text-xs font-medium text-slate-500 mb-3">{t(lang, "aidePreviewAllocation")}</p>
                <AllocationRow label={t(lang, "needsLabel")} actualPct={pct(needsMonthly)} targetPct={50} color={theme.danger} lang={lang} />
                <AllocationRow label={t(lang, "wantsLabel")} actualPct={pct(wantsMonthly)} targetPct={30} color={theme.secondary} lang={lang} />
                <AllocationRow label={t(lang, "savingsLabel")} actualPct={pct(savingsMonthly)} targetPct={20} color={theme.primary} lang={lang} />
                {totalOut > monthlyIncome && (
                  <p className="text-xs mt-2 p-2 rounded-lg" style={{ backgroundColor: "#FEF2F2", color: "#991B1B" }}>
                    {t(lang, "overBudgetWarning").replace("{total}", money(totalOut, state.currency)).replace("{income}", money(monthlyIncome, state.currency))}
                  </p>
                )}
              </>
            )}

            {selectedMethod === "enveloppes" && (
              <>
                <p className="text-xs font-medium text-slate-500 mb-3">{t(lang, "aidePreviewEnvelopes")}</p>
                {envelopes.length === 0 ? (
                  <p className="text-sm text-slate-400">{t(lang, "aideNoDebtsProjects")}</p>
                ) : (
                  envelopes.map((e) => <EnvelopeMiniRow key={e.id} title={e.title} pct={e.pct} color={e.color} sub={e.sub} />)
                )}
              </>
            )}

            {selectedMethod === "payer-premier" && (
              <>
                <p className="text-xs font-medium text-slate-500 mb-3">{t(lang, "aidePreviewPayFirst")}</p>
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
                  <div style={{ width: `${Math.min(100, pct(savingsMonthly))}%`, backgroundColor: theme.primary }} />
                  <div className="flex-1" style={{ backgroundColor: "#E2E8F0" }} />
                </div>
                <div className="flex justify-between text-xs mt-1.5 text-slate-500">
                  <span>{t(lang, "payFirstSetAside").replace("{amount}", money(savingsMonthly, state.currency))}</span>
                  <span>{t(lang, "payFirstRest").replace("{amount}", money(Math.max(0, restMonthly), state.currency))}</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  {t(lang, "payFirstExplain")
                    .replace("{saved}", money(savingsMonthly, state.currency))
                    .replace("{rest}", money(Math.max(0, restMonthly), state.currency))}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// App principale
// ---------------------------------------------------------------------------
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendLink = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: "#E6F4F1" }}>
      <GlobalStyles />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <div className="w-12 h-12 rounded-xl overflow-hidden mb-4">
          <img src={LOGO_SEREIN} alt="Serein" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Serein</h1>
        {sent ? (
          <p className="text-sm text-slate-600 leading-relaxed">
            Un lien de connexion a été envoyé à <strong>{email}</strong>. Ouvre-le depuis cet appareil pour te connecter.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              Entre ton e-mail — tu recevras un lien pour te connecter, sans mot de passe.
            </p>
            <input
              type="email"
              className={inputCls}
              placeholder="toi@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendLink()}
            />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button
              onClick={sendLink}
              disabled={!email || loading}
              className="mt-4 w-full text-sm font-medium text-white px-4 py-2.5 rounded-lg disabled:opacity-40"
              style={{ backgroundColor: "#5BC2B4" }}
            >
              {loading ? "Envoi…" : "Recevoir mon lien de connexion"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("calendar");
  const [showSettings, setShowSettings] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [session, setSession] = useState(undefined); // undefined = pas encore vérifié, null = pas connecté

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Vérifie si l'utilisateur est déjà connecté, et écoute les changements (connexion/déconnexion)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Charge les données de CET utilisateur depuis Supabase une fois connecté
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("app_state")
          .select("data")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setState(data ? data.data : defaultState);
      } catch {
        setState(defaultState);
      }
    })();
  }, [session]);

  // Sauvegarde à chaque changement, dans la ligne propre à cet utilisateur
  useEffect(() => {
    if (!state || !session) return;
    supabase
      .from("app_state")
      .upsert({ user_id: session.user.id, data: state, updated_at: new Date().toISOString() })
      .then(() => {});
  }, [state, session]);

  if (session === undefined || !splashDone) {
    return <SplashScreen />;
  }

  if (session === null) {
    return <LoginScreen />;
  }

  if (!state) {
    return <SplashScreen />;
  }

  setMoneyLocale(state.language || "fr");

  const theme = themeFor(state);

  if (!state.onboardingDone) {
    return (
      <Onboarding
        state={state}
        setState={setState}
        onFinish={() => setState((s) => ({ ...s, onboardingDone: true }))}
      />
    );
  }

  const lang = state.language || "fr";

  const tabs = [
    { id: "calendar", label: t(lang, "tabCalendar"), icon: CalendarIcon },
    { id: "debts", label: t(lang, "tabDebts"), icon: Wallet },
    { id: "projects", label: t(lang, "tabProjects"), icon: Target },
    { id: "investments", label: t(lang, "tabInvestments"), icon: TrendingUp },
    { id: "aide", label: t(lang, "tabAide"), icon: Lightbulb },
  ];

  const profileLabel = state.profileType ? t(lang, `profile_${state.profileType}`) : null;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: theme.soft, color: theme.text }}>
      <GlobalStyles />
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_SEREIN} alt="Serein" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
          <div>
            <h1 className="font-semibold text-lg">{state.userName ? `${t(lang, "hello")}, ${state.userName}` : t(lang, "appName")}</h1>
            {profileLabel && <p className="text-xs text-slate-400">{profileLabel} · {state.currency}</p>}
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg bg-white shadow-sm">
          <Settings size={18} style={{ color: theme.primary }} />
        </button>
      </div>

      {tab === "calendar" && <CalendarTab theme={theme} state={state} setState={setState} />}
      {tab === "debts" && <DebtsTab theme={theme} state={state} setState={setState} onGoToAide={() => setTab("aide")} />}
      {tab === "projects" && <ProjectsTab theme={theme} state={state} setState={setState} />}
      {tab === "investments" && <InvestmentsTab theme={theme} state={state} setState={setState} />}
      {tab === "aide" && <AideTab theme={theme} state={state} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon size={20} color={active ? theme.primary : "#94a3b8"} />
              <span className="text-[10px]" style={{ color: active ? theme.primary : "#94a3b8" }}>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {showSettings && (
        <SettingsPanel
          theme={theme}
          state={state}
          setState={setState}
          onClose={() => setShowSettings(false)}
          onReset={() => {
            setState(defaultState);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

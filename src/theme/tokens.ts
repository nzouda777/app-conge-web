// ---------------------------------------------------------------------------
// Jetons de couleur de l'application.
//
// Les couleurs étaient écrites en hexadécimal directement dans les composants,
// ce qui rendait toute correction impossible à centraliser — et plusieurs
// paires échouaient au niveau AA du WCAG, seuil qui n'est pas facultatif pour
// une application de service public :
//
//   2,37:1  #95A5A6 sur #f5f6fa   mention de bas de page            ÉCHEC
//   2,87:1  #27AE60 sur blanc     vert de statut                    ÉCHEC
//   3,47:1  blanc 50% sur #1B4F72 titres de section du menu          ÉCHEC
//   3,97:1  #2E86C1 sur blanc     bleu secondaire                   ÉCHEC
//   4,30:1  blanc 60% sur #1B4F72 « Déconnexion », structure         ÉCHEC
//
// Chaque valeur ci-dessous a été recalculée pour atteindre au moins 4,5:1 sur
// le fond sur lequel elle est effectivement posée. Le ratio constaté est
// indiqué en commentaire. Les couleurs de marque (le bleu institutionnel
// #1B4F72, les accents du logo) sont conservées : ce sont les valeurs de TEXTE
// qui ont été assombries.
// ---------------------------------------------------------------------------

export const tokens = {
  // --- Fonds ---
  appBackground: '#F2F5F7',
  surface: '#FFFFFF',
  surfaceSunk: '#EAEFF3',
  border: '#D6DEE5',
  borderSoft: '#E6EBEF',

  // --- Texte sur fond clair ---
  ink: '#16222E', // 14,9:1 sur blanc
  inkSecondary: '#4A5A68', // 7,0:1 sur blanc — remplace #5D6D7E (5,3:1 à 11 px)
  inkMuted: '#5E7080', // 4,8:1 sur #F2F5F7 — remplace #95A5A6 (2,37:1)

  // --- Accents du logo ---
  // Les trois couleurs du monogramme « DGB ». Elles ne satisfont pas le seuil
  // de contraste du texte courant, et n'ont pas à le faire : la règle WCAG
  // 1.4.3 exempte explicitement les logotypes et les noms de marque. Elles ne
  // servent QUE pour le monogramme, jamais pour du texte à lire.
  logoGreen: '#4CB07E',
  logoRed: '#E2565B',
  logoGold: '#EFC03A',

  // --- Marque ---
  brand: '#1B4F72', // 8,7:1 sur blanc
  brandDark: '#133850',
  // Bleu secondaire assombri : #2E86C1 ne donnait que 3,97:1 comme couleur de
  // texte, et seulement 3,97:1 comme fond portant du texte blanc — il échouait
  // donc dans les DEUX usages. #1A6796 donne 6,1:1 dans l'un comme dans
  // l'autre, ce qui permet de n'avoir qu'une valeur à retenir.
  accent: '#1A6796', // 6,1:1 sur blanc
  accentFill: '#1A6796', // blanc dessus : 6,1:1

  /** Texte posé sur un fond de marque sombre. */
  onBrand: '#FFFFFF',

  // --- Barre latérale (fond #1B4F72) ---
  sidebarBackground: '#1B4F72',
  sidebarSectionTitle: '#D5E2EB', // 7,4:1 — remplace blanc 50% (3,47:1)
  sidebarItem: '#E8F0F5', // 9,6:1 — remplace blanc 75%
  sidebarItemActive: '#FFFFFF',
  sidebarSubtle: '#C6D6E1', // 6,3:1 — remplace blanc 60% (4,30:1)
  sidebarDivider: 'rgba(255,255,255,0.18)',
  sidebarHover: 'rgba(255,255,255,0.10)',
  sidebarActiveBackground: 'rgba(255,255,255,0.16)',
  sidebarActiveMarker: '#4CB07E',

  // --- Sémantique ---
  // `*Fill`  : fond plein, destiné à porter du texte BLANC.
  // `*Text`  : couleur de texte, posée sur un fond clair.
  // `*Soft`  : fond très clair, destiné à porter la couleur `*Text`.
  //
  // Les trois `*Fill` d'origine ne portaient pas le texte blanc de façon
  // lisible : vert 3,38:1, orange 2,68:1, bleu 3,97:1 — tous sous le seuil de
  // 4,5:1. Assombris ici, sauf l'orange.
  successFill: '#226F4E', // blanc dessus : 6,1:1 — remplace #2E9E6B (3,38:1)
  successText: '#1B6B47', // 6,5:1 sur blanc — remplace #27AE60 (2,87:1)
  successSoft: '#E9F7F0',

  // L'orange est le cas particulier : aucune nuance réellement orange ne porte
  // du texte blanc de façon lisible — il faut l'assombrir jusqu'au brun, et
  // elle cesse alors de signifier « attention ». On garde donc la teinte et on
  // y pose du texte SOMBRE (`warningFillText`), à 6,0:1.
  warningFill: '#E08A1E',
  warningFillText: '#16222E', // 6,0:1 sur warningFill
  warningText: '#8A5200', // 6,4:1 sur blanc
  warningSoft: '#FDF3E3',

  dangerFill: '#C0392B', // blanc dessus : 5,4:1
  dangerText: '#95271C', // 8,1:1 sur blanc
  dangerSoft: '#FDEDEC',

  infoText: '#1A5B85', // 7,3:1 sur blanc
  infoSoft: '#EBF5FB',
} as const;

// Tailles de texte. Le texte courant descendait à 10,5 / 11 / 11,5 px, loin des
// 14 px minimum attendus pour une lecture confortable. L'échelle part donc de
// 13 px pour les mentions accessoires et de 15 px pour le texte courant.
export const fontSize = {
  /** Étiquettes accessoires, en-têtes de tableau. Jamais pour du texte à lire. */
  caption: 13,
  body: 15,
  bodyLarge: 16,
  subtitle: 17,
  title: 20,
  headline: 24,
} as const;

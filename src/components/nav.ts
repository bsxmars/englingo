/** The app's sections: links in the top bar on a wide screen, tabs at the bottom on a phone. */
export const NAV = [
  { to: '/', label: 'Курс', icon: 'M4 5h16M4 12h16M4 19h10' },
  { to: '/review', label: 'Повторение', icon: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4' },
  { to: '/progress', label: 'Прогресс', icon: 'M5 20V12M12 20V5M19 20v-6' },
] as const;

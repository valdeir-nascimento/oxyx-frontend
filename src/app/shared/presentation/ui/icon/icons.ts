/**
 * Ícones do design system (design-system/icons): traço de 1,75 em grade de 24, pontas arredondadas e
 * cor herdada do texto (currentColor).
 *
 * Gerado a partir dos SVGs, forma por forma, para o componente desenhar cada uma com atributos, sem
 * innerHTML nem desvio do sanitizador. Para acrescentar um ícone, acrescente o SVG ao design system
 * e a sua linha aqui.
 */
export type IconShape =
  | { readonly kind: 'path'; readonly d: string }
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly rx: number;
      readonly dash?: string;
    };

export const ICONS = {
  alert: [{ kind: 'path', d: 'M12 4l9.5 16h-19z' }, { kind: 'path', d: 'M12 10v4.5M12 17.5v.01' }],
  arrowR: [{ kind: 'path', d: 'M5 12h14M13 6l6 6-6 6' }],
  barn: [{ kind: 'path', d: 'M3 21V9.5L12 4l9 5.5V21' }, { kind: 'path', d: 'M9 21v-6h6v6' }, { kind: 'path', d: 'M2 21h20' }],
  bell: [{ kind: 'path', d: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z' }, { kind: 'path', d: 'M10 20.5a2.2 2.2 0 0 0 4 0' }],
  box: [{ kind: 'rect', x: 3, y: 5, width: 18, height: 14, rx: 2, dash: '3 3' }],
  cage: [{ kind: 'rect', x: 3, y: 5, width: 18, height: 15, rx: 2 }, { kind: 'path', d: 'M8 5v15M12 5v15M16 5v15M5 2.5h14' }],
  calendar: [{ kind: 'rect', x: 4, y: 5, width: 16, height: 16, rx: 2 }, { kind: 'path', d: 'M4 10h16M8 3v4M16 3v4' }],
  chart: [{ kind: 'path', d: 'M3 3v18h18' }, { kind: 'path', d: 'M7 14l4-4 3 3 6-6' }],
  check: [{ kind: 'path', d: 'M5 12.5l4.5 4.5L19 7.5' }],
  chevD: [{ kind: 'path', d: 'M6 9l6 6 6-6' }],
  chevL: [{ kind: 'path', d: 'M15 6l-6 6 6 6' }],
  chevR: [{ kind: 'path', d: 'M9 6l6 6-6 6' }],
  clock: [{ kind: 'circle', cx: 12, cy: 12, r: 9 }, { kind: 'path', d: 'M12 7v5l3 2' }],
  coin: [{ kind: 'circle', cx: 12, cy: 12, r: 9 }, { kind: 'path', d: 'M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.7 0-2.8.9-2.8 2.1 0 2.9 5.8 1.5 5.8 4.3 0 1.2-1.2 2.1-3 2.1-1.4 0-2.5-.6-3-1.5M12 6v1.8M12 16.3V18' }],
  copy: [{ kind: 'rect', x: 8, y: 8, width: 12, height: 12, rx: 2 }, { kind: 'path', d: 'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' }],
  down: [{ kind: 'path', d: 'M12 5v14M6 13l6 6 6-6' }],
  download: [{ kind: 'path', d: 'M12 4v11M7 10.5l5 5 5-5M5 20h14' }],
  edit: [{ kind: 'path', d: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z' }, { kind: 'path', d: 'M13.5 6.5l4 4' }],
  egg: [{ kind: 'path', d: 'M12 3c3.6 0 7 5.6 7 10.2A7 7 0 0 1 5 13.2C5 8.6 8.4 3 12 3z' }],
  eye: [{ kind: 'path', d: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' }, { kind: 'circle', cx: 12, cy: 12, r: 3 }],
  filter: [{ kind: 'path', d: 'M4 5h16l-6 7.5V19l-4 1.5v-8z' }],
  flask: [{ kind: 'path', d: 'M9 3h6' }, { kind: 'path', d: 'M10 3v6.5L4.6 18.2A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.8L14 9.5V3' }, { kind: 'path', d: 'M7.5 15h9' }],
  flow: [{ kind: 'circle', cx: 5, cy: 6, r: 2.5 }, { kind: 'circle', cx: 19, cy: 6, r: 2.5 }, { kind: 'circle', cx: 12, cy: 18, r: 2.5 }, { kind: 'path', d: 'M7.5 6h9M6.5 8l4.3 7.8M17.5 8l-4.3 7.8' }],
  form: [{ kind: 'rect', x: 3, y: 4, width: 18, height: 6, rx: 1.5 }, { kind: 'rect', x: 3, y: 14, width: 18, height: 6, rx: 1.5 }, { kind: 'path', d: 'M6 7h5M6 17h3' }],
  grain: [{ kind: 'path', d: 'M12 21V10' }, { kind: 'path', d: 'M12 10c-2.8 0-4.5-2-4.5-5 2.8 0 4.5 2 4.5 5z' }, { kind: 'path', d: 'M12 10c2.8 0 4.5-2 4.5-5-2.8 0-4.5 2-4.5 5z' }, { kind: 'path', d: 'M12 16c-2.8 0-4.5-2-4.5-5 2.8 0 4.5 2 4.5 5z' }, { kind: 'path', d: 'M12 16c2.8 0 4.5-2 4.5-5-2.8 0-4.5 2-4.5 5z' }],
  grid: [{ kind: 'rect', x: 4, y: 4, width: 7, height: 7, rx: 1.5 }, { kind: 'rect', x: 13, y: 4, width: 7, height: 7, rx: 1.5 }, { kind: 'rect', x: 4, y: 13, width: 7, height: 7, rx: 1.5 }, { kind: 'rect', x: 13, y: 13, width: 7, height: 7, rx: 1.5 }],
  info: [{ kind: 'circle', cx: 12, cy: 12, r: 9 }, { kind: 'path', d: 'M12 11v5.5M12 7.5v.01' }],
  layers: [{ kind: 'path', d: 'M12 3l9 5-9 5-9-5 9-5z' }, { kind: 'path', d: 'M3 13l9 5 9-5' }],
  lock: [{ kind: 'rect', x: 5, y: 11, width: 14, height: 10, rx: 2 }, { kind: 'path', d: 'M8 11V8a4 4 0 0 1 8 0v3' }],
  logout: [{ kind: 'path', d: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4' }, { kind: 'path', d: 'M9 8l-4 4 4 4' }, { kind: 'path', d: 'M5 12h11' }],
  mail: [{ kind: 'rect', x: 3, y: 5, width: 18, height: 14, rx: 2 }, { kind: 'path', d: 'M3.5 6.5l8.5 6 8.5-6' }],
  menu: [{ kind: 'path', d: 'M4 7h16M4 12h16M4 17h16' }],
  minus: [{ kind: 'path', d: 'M5 12h14' }],
  moon: [{ kind: 'path', d: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' }],
  palette: [{ kind: 'path', d: 'M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.8 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z' }, { kind: 'circle', cx: 7.5, cy: 11, r: 1 }, { kind: 'circle', cx: 10, cy: 7, r: 1 }, { kind: 'circle', cx: 15, cy: 7, r: 1 }],
  percent: [{ kind: 'path', d: 'M19 5L5 19' }, { kind: 'circle', cx: 7, cy: 7, r: 2.5 }, { kind: 'circle', cx: 17, cy: 17, r: 2.5 }],
  phone: [{ kind: 'rect', x: 7, y: 3, width: 10, height: 18, rx: 2 }, { kind: 'path', d: 'M11 18h2' }],
  plus: [{ kind: 'path', d: 'M12 5v14M5 12h14' }],
  pulse: [{ kind: 'path', d: 'M19.5 5.5a4.6 4.6 0 0 0-6.5 0L12 6.6l-1-1.1a4.6 4.6 0 0 0-6.5 6.5L12 19.5l7.5-7.5a4.6 4.6 0 0 0 0-6.5z' }, { kind: 'path', d: 'M4 12h4l1.5-2 3 4 1.5-2h6' }],
  report: [{ kind: 'rect', x: 5, y: 4, width: 14, height: 17, rx: 2 }, { kind: 'path', d: 'M9 4.5V3h6v1.5' }, { kind: 'path', d: 'M9 10h6M9 14h6M9 18h3' }],
  ruler: [{ kind: 'rect', x: 3, y: 8, width: 18, height: 8, rx: 1.5 }, { kind: 'path', d: 'M7 8v3M11 8v4M15 8v3M19 8v4' }],
  scale: [{ kind: 'path', d: 'M6.5 9h11l2 11h-15z' }, { kind: 'path', d: 'M9.5 9a2.5 2.5 0 1 1 5 0' }],
  search: [{ kind: 'circle', cx: 11, cy: 11, r: 6.5 }, { kind: 'path', d: 'M20 20l-4.2-4.2' }],
  shapes: [{ kind: 'rect', x: 3, y: 3, width: 8, height: 8, rx: 2 }, { kind: 'circle', cx: 17, cy: 7, r: 4 }, { kind: 'path', d: 'M7 14l4.5 7h-9z' }, { kind: 'rect', x: 13, y: 13, width: 8, height: 8, rx: 4 }],
  shield: [{ kind: 'path', d: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z' }],
  sidebar: [{ kind: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 }, { kind: 'path', d: 'M9 3v18' }],
  sliders: [{ kind: 'path', d: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0' }, { kind: 'circle', cx: 16, cy: 6, r: 2 }, { kind: 'circle', cx: 10, cy: 12, r: 2 }, { kind: 'circle', cx: 18, cy: 18, r: 2 }],
  sun: [{ kind: 'circle', cx: 12, cy: 12, r: 4 }, { kind: 'path', d: 'M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4' }],
  swap: [{ kind: 'path', d: 'M4 7h13l-3-3M20 17H7l3 3' }],
  table: [{ kind: 'rect', x: 3, y: 4, width: 18, height: 16, rx: 2 }, { kind: 'path', d: 'M3 9.5h18M3 15h18M9 9.5V20' }],
  tag: [{ kind: 'path', d: 'M3.5 3.5H11l9.5 9.5-7.5 7.5-9.5-9.5z' }, { kind: 'circle', cx: 8, cy: 8, r: 1.5 }],
  toggle: [{ kind: 'rect', x: 2.5, y: 7, width: 19, height: 10, rx: 5 }, { kind: 'circle', cx: 16.5, cy: 12, r: 2.5 }],
  trash: [{ kind: 'path', d: 'M4 7h16' }, { kind: 'path', d: 'M10 11v6M14 11v6' }, { kind: 'path', d: 'M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7' }, { kind: 'path', d: 'M9 7V4.5h6V7' }],
  type: [{ kind: 'path', d: 'M5 7V5h14v2M12 5v14M9 19h6' }],
  up: [{ kind: 'path', d: 'M12 19V5M6 11l6-6 6 6' }],
  user: [{ kind: 'circle', cx: 12, cy: 8, r: 4 }, { kind: 'path', d: 'M4 21a8 8 0 0 1 16 0' }],
  users: [{ kind: 'circle', cx: 9, cy: 8, r: 3.5 }, { kind: 'path', d: 'M2.5 20a6.5 6.5 0 0 1 13 0' }, { kind: 'path', d: 'M16 4.5a3.5 3.5 0 0 1 0 7' }, { kind: 'path', d: 'M18.5 14.5A6.5 6.5 0 0 1 21.5 20' }],
  window: [{ kind: 'rect', x: 3, y: 4, width: 18, height: 16, rx: 2 }, { kind: 'path', d: 'M3 8.5h18M14 15h4' }],
  x: [{ kind: 'path', d: 'M6 6l12 12M18 6L6 18' }],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof ICONS;

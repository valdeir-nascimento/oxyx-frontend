/**
 * Item de navegação.
 *
 * `administratorOnly` é o que permite a FR-011 ser cumprida sem espalhar `if` pelos componentes:
 * a navegação filtra a lista pelo perfil de quem está autenticado, e quem é usuário comum
 * simplesmente não vê a opção.
 *
 * Esconder o item **não** é a proteção — a proteção é a autorização declarada no backend. Isto
 * aqui evita oferecer ao usuário um caminho que terminaria em 403.
 */
export interface MenuItem {
  readonly label: string;
  readonly route: string;
  readonly administratorOnly: boolean;
}

/** Itens do sistema. Cresce conforme os domínios seguintes forem entregues. */
export const MENU_ITEMS: readonly MenuItem[] = [
  { label: 'Início', route: '/', administratorOnly: false },
  { label: 'Responsáveis', route: '/responsaveis', administratorOnly: true },
];

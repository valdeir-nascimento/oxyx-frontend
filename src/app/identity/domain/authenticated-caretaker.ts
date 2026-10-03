import { ThemePreference } from '../../shared/domain/theme-preference';

/** Perfil do responsável, no mesmo vocabulário do backend. */
export type Role = 'ADMINISTRATOR' | 'USER';

/** Se o perfil dá acesso à administração: o menu e o guard perguntam a mesma coisa, num lugar só. */
export function isAdministrator(role: Role): boolean {
  return role === 'ADMINISTRATOR';
}

/**
 * Quem está na sessão, como a tela precisa dele.
 *
 * Espelha o modelo de leitura `AuthenticatedCaretaker` do backend: identidade, nome exibido, perfil,
 * a obrigação de trocar a senha provisória e o tema da conta (feature 011). Nunca carrega senha nem hash.
 */
export interface AuthenticatedCaretaker {
  readonly id: string;
  readonly fullName: string;
  readonly role: Role;
  readonly mustChangePassword: boolean;
  /**
   * O tema da conta na última consulta, aplicado na entrada, na restauração da sessão e depois da troca da senha
   * provisória (feature 011). Fica velho com a escolha feita no seletor: o tema em vigor é o `THEME_DISPLAY.current`.
   */
  readonly theme: ThemePreference;
}

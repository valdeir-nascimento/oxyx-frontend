/** Perfil do responsável, no mesmo vocabulário do backend. */
export type Role = 'ADMINISTRATOR' | 'USER';

/**
 * Quem está na sessão, como a tela precisa dele.
 *
 * Espelha o modelo de leitura `AuthenticatedCaretaker` do backend: identidade, nome exibido, perfil
 * e a obrigação de trocar a senha provisória. Nunca carrega senha nem hash.
 */
export interface AuthenticatedCaretaker {
  readonly id: string;
  readonly fullName: string;
  readonly role: Role;
  readonly mustChangePassword: boolean;
}

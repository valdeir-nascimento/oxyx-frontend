/**
 * O que a pessoa digita na tela de troca de senha.
 *
 * Não há regra do lado do cliente: a política e o preenchimento são conferidos pelo backend, que
 * devolve todas as recusas de uma vez (FR-017, FR-022).
 */
export interface PasswordChange {
  readonly currentPassword: string;
  readonly newPassword: string;
}

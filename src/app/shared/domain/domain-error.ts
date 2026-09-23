/**
 * Uma violação de regra de negócio, como o backend a devolve.
 *
 * Montada do corpo de erro do backend: o `code` vem da extensão `code` do Problem Details e é
 * estável e serve para reagir de forma programática; a `message` é o texto em português que vai
 * para a tela.
 */
export interface DomainError {
  readonly code: string;
  /** Ausente quando a violação é da operação como um todo, e não de um campo. */
  readonly field?: string;
  readonly message: string;
}

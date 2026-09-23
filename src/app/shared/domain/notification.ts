import { DomainError } from './domain-error';

/**
 * Conjunto de violações de uma operação, como a tela precisa delas (FR-017).
 *
 * O backend devolve **todas** as violações de uma vez (FR-017). Esta classe existe para que o
 * formulário consiga distribuir cada mensagem ao seu campo sem espalhar lógica de busca pelos
 * componentes.
 */
export class Notification {
  private constructor(private readonly items: readonly DomainError[]) {}

  static empty(): Notification {
    return new Notification([]);
  }

  static of(errors: readonly DomainError[]): Notification {
    return new Notification([...errors]);
  }

  get errors(): readonly DomainError[] {
    return this.items;
  }

  get hasErrors(): boolean {
    return this.items.length > 0;
  }

  /** Violações de um campo específico — é o que o formulário exibe junto ao input. */
  forField(field: string): readonly DomainError[] {
    return this.items.filter((error) => error.field === field);
  }

  /** Primeira mensagem de um campo, para exibição simples. */
  messageFor(field: string): string | undefined {
    return this.forField(field)[0]?.message;
  }

  /** Violações sem campo associado — vão para o topo do formulário. */
  get generalErrors(): readonly DomainError[] {
    return this.items.filter((error) => !error.field);
  }
}

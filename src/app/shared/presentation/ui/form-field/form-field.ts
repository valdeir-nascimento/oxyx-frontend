import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/** Natureza do que se digita. Decide o teclado do celular e o sigilo do que aparece na tela. */
export type FormFieldType = 'text' | 'password' | 'email' | 'tel';

/**
 * Campo de formulário: rótulo, entrada, texto de ajuda e mensagem de recusa.
 *
 * É o que as telas de acesso e de troca de senha repetiam linha por linha. O componente não valida
 * nada e não conhece o formulário inteiro: recebe um controle e uma mensagem já em português — a
 * que o backend devolveu — e se encarrega da ligação que ninguém vê e todo mundo precisa. O
 * `aria-describedby` é o que faz o leitor de tela anunciar a recusa junto do campo que a causou, em
 * vez de solta no fim da página; sem ele, a pessoa ouve "E-mail ou celular, editado" e nada mais.
 *
 * ```html
 * <ovyx-form-field
 *   controlId="password"
 *   label="Senha"
 *   type="password"
 *   autocomplete="current-password"
 *   [control]="form.controls.password"
 *   [error]="messageFor('password')"
 * />
 * ```
 */
@Component({
  selector: 'ovyx-form-field',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field">
      <label class="field__label" [for]="controlId()">{{ label() }}</label>
      <input
        class="field__control"
        [id]="controlId()"
        [type]="type()"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="error() ? 'true' : null"
      />
      @if (error(); as message) {
        <p class="field__error" [id]="errorId()">{{ message }}</p>
      }
      @if (hint(); as text) {
        <p class="field__hint" [id]="hintId()">{{ text }}</p>
      }
    </div>
  `,
  styles: `
    /* Elemento personalizado nasce inline. Nas telas de hoje funciona por acaso, porque o
     * pai é sempre uma grade; num fluxo normal o componente encolheria no conteúdo. */
    :host {
      display: block;
    }

    .field {
      display: grid;
      gap: var(--ovyx-space-1);
    }

    .field__label {
      font-size: var(--ovyx-font-size-sm);
      font-weight: var(--ovyx-font-weight-medium);
      color: var(--ovyx-color-text);
    }

    .field__control {
      min-height: var(--ovyx-control-height-md);
      padding: 0 var(--ovyx-space-3);
      background-color: var(--ovyx-color-surface-raised);
      border: var(--ovyx-border-width-thin) solid var(--ovyx-color-border);
      border-radius: var(--ovyx-radius-sm);
      color: var(--ovyx-color-text);
    }

    /* Recusado não é dito só por cor: o traço engrossa junto com a mudança de tom, e a mensagem
     * continua a ser o que explica o problema. */
    .field__control[aria-invalid='true'] {
      border-width: var(--ovyx-border-width-thick);
      border-color: var(--ovyx-color-danger-border);
    }

    .field__error {
      font-size: var(--ovyx-font-size-sm);
      color: var(--ovyx-color-danger-text);
    }

    .field__hint {
      font-size: var(--ovyx-font-size-sm);
      color: var(--ovyx-color-text-muted);
    }
  `,
})
export class FormField {
  /** O controle que guarda o que foi digitado. O campo escreve nele e não o valida. */
  readonly control = input.required<FormControl<string>>();

  /** `id` da entrada. É o que liga rótulo, ajuda e mensagem de erro a ela. */
  readonly controlId = input.required<string>();

  /** Rótulo visível, em português. */
  readonly label = input.required<string>();

  readonly type = input<FormFieldType>('text');

  /** Valor de `autocomplete`, para o navegador e o gerenciador de senhas ajudarem a preencher. */
  readonly autocomplete = input<string>();

  /** Orientação permanente sobre o preenchimento. */
  readonly hint = input<string>();

  /** Mensagem de recusa, já em português; ausente quando o campo não foi recusado. */
  readonly error = input<string>();

  protected readonly errorId = computed(() => `${this.controlId()}-error`);
  protected readonly hintId = computed(() => `${this.controlId()}-hint`);

  /**
   * A recusa vem primeiro: é o que impede a pessoa de continuar, e o leitor de tela anuncia na
   * ordem em que os identificadores aparecem.
   */
  protected readonly describedBy = computed(() => {
    const described = [this.error() ? this.errorId() : null, this.hint() ? this.hintId() : null]
      .filter((id): id is string => id !== null)
      .join(' ');

    return described === '' ? null : described;
  });
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/** Uma opção da lista: o valor que vai para o controle e o rótulo em português. */
export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Campo de escolha numa lista fechada: rótulo, lista e mensagem de recusa.
 *
 * O mesmo contrato do `ovyx-form-field` — controle, `id`, rótulo e erro já em português —, com a
 * mesma ligação por `aria-describedby`, para que a recusa seja lida junto da escolha que a causou.
 *
 * ```html
 * <ovyx-select-field
 *   controlId="role"
 *   label="Perfil"
 *   [control]="form.controls.role"
 *   [options]="roles"
 *   [error]="messageFor('role')"
 * />
 * ```
 */
@Component({
  selector: 'ovyx-select-field',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field">
      <label class="field__label" [for]="controlId()">{{ label() }}</label>
      <select
        class="field__control"
        [id]="controlId()"
        [formControl]="control()"
        [attr.aria-describedby]="error() ? errorId() : null"
        [attr.aria-invalid]="error() ? 'true' : null"
      >
        @for (option of options(); track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
      @if (error(); as message) {
        <p class="field__error" [id]="errorId()">{{ message }}</p>
      }
    </div>
  `,
  styles: `
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

    /* Recusado não é dito só por cor, como no ovyx-form-field. */
    .field__control[aria-invalid='true'] {
      border-width: var(--ovyx-border-width-thick);
      border-color: var(--ovyx-color-danger-border);
    }

    .field__error {
      font-size: var(--ovyx-font-size-sm);
      color: var(--ovyx-color-danger-text);
    }
  `,
})
export class SelectField {
  /** O controle que guarda o valor escolhido. O campo escreve nele e não o valida. */
  readonly control = input.required<FormControl<string>>();

  /** `id` da lista. É o que liga rótulo e mensagem de erro a ela. */
  readonly controlId = input.required<string>();

  /** Rótulo visível, em português. */
  readonly label = input.required<string>();

  readonly options = input.required<readonly SelectOption[]>();

  /** Mensagem de recusa, já em português; ausente quando a escolha não foi recusada. */
  readonly error = input<string>();

  protected readonly errorId = computed(() => `${this.controlId()}-error`);
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';

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
  imports: [ReactiveFormsModule, Icon],
  host: { '[class.span2]': 'wide()' },
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  /** Ocupa as duas colunas do corpo do diálogo (`.span2`). */
  readonly wide = input(false);

  protected readonly errorId = computed(() => `${this.controlId()}-error`);
}

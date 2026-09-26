import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** Natureza do que se digita. Decide o teclado do celular e o sigilo do que aparece na tela. */
/** Os tipos de campo em uso; data e hora vieram com o relatório diário (feature 003). */
export type FormFieldType = 'text' | 'password' | 'email' | 'tel' | 'date' | 'time';

/**
 * Campo de formulário com o `.field` do design system: rótulo, entrada, texto de ajuda e mensagem de
 * recusa.
 *
 * É o que as telas de acesso e de troca de senha repetiam linha por linha. O componente não valida
 * nada e não conhece o formulário inteiro: recebe um controle e uma mensagem já em português — a
 * que o backend devolveu — e se encarrega da ligação que ninguém vê e todo mundo precisa. O
 * `aria-describedby` é o que faz o leitor de tela anunciar a recusa junto do campo que a causou, em
 * vez de solta no fim da página; sem ele, a pessoa ouve "E-mail ou celular, editado" e nada mais.
 *
 * A senha ganha o `.pw-toggle` do design system, um botão de alternância (`aria-pressed`) que mostra
 * o que foi digitado. O design system troca a ajuda pela recusa; aqui as duas ficam, porque a ajuda
 * da senha explica a política justamente quando ela é recusada — a ajuda mantém a cor neutra.
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
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.span2]': 'wide()' },
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

  /** Ícone à esquerda da entrada, decorativo, como o envelope do e-mail. */
  readonly icon = input<IconName>();

  /** Ocupa as duas colunas do corpo do diálogo (`.span2`). */
  readonly wide = input(false);

  /**
   * Texto longo, numa área de várias linhas (`.control.area` do design system), como a descrição de
   * um setor: numa linha só, a pessoa não vê o que escreveu.
   */
  readonly multiline = input(false);

  /**
   * O teclado que o celular abre, como `numeric` para quantidades. O campo continua de texto: o que
   * foi digitado vai como está, e quem recusa um valor que não é número é o backend (FR-017).
   */
  readonly inputMode = input<'numeric' | 'text'>();

  /** Se a senha está à mostra. Volta a ficar oculta a cada vez que a tela abre. */
  protected readonly revealed = signal(false);

  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );

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

  protected toggleReveal(): void {
    this.revealed.update((revealed) => !revealed);
  }
}

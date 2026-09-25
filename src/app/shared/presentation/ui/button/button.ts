import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** Peso visual da ação: o que ela representa, não a cor que ela tem. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';

/** Altura do botão no design system: 32 (`sm`), 40 (o padrão) e 48 px (`lg`). */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Ação do sistema, com o `.btn` do design system.
 *
 * Envolve um `<button>` nativo em vez de estilizar um `<div>`: teclado, foco, `disabled` e
 * submissão de formulário continuam sendo trabalho do navegador. O componente não sabe o que a
 * ação faz — ele avisa que foi pressionado, e quem o usa decide.
 *
 * `busy` é o que impede o duplo envio: enquanto a operação corre, o botão fica desabilitado, troca
 * o ícone pelo `.spinner` e anuncia `aria-busy`. O elemento do componente não ocupa caixa
 * (`display: contents`), para o `<button>` ser o item do `.actions`, do `.dlg-foot` ou do
 * formulário, como no design system — é assim que `btn-block` e o botão esticado do celular
 * funcionam.
 */
@Component({
  selector: 'ovyx-button',
  imports: [Icon],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  /** Peso da ação. `primary` é uma por tela; `danger` é reservado ao que destrói ou inativa. */
  readonly variant = input<ButtonVariant>('primary');

  readonly size = input<ButtonSize>('md');

  /** Ocupa a largura toda do contêiner, como o "Entrar" da tela de acesso. */
  readonly block = input(false);

  /** Ícone antes do rótulo, decorativo: o rótulo continua sendo o nome da ação. */
  readonly icon = input<IconName>();

  /** Ícone depois do rótulo, como a seta de "Entrar". */
  readonly trailingIcon = input<IconName>();

  /** `submit` entrega o envio do formulário ao navegador; `button` é o padrão. */
  readonly type = input<'button' | 'submit'>('button');

  readonly disabled = input(false);

  /** Verdadeiro enquanto a ação corre: bloqueia o segundo clique e anuncia o andamento. */
  readonly busy = input(false);

  /**
   * Nome completo para o leitor de tela, quando o rótulo visível se repete — "Inativar" em cada
   * linha de uma lista não diz a quem. Deve começar pelo rótulo visível, para quem comanda por voz.
   */
  readonly accessibleName = input<string>();

  /** O botão avisa que foi pressionado; quem o usa decide o que isso significa. */
  readonly pressed = output<void>();

  protected readonly classes = computed(() =>
    [
      'btn',
      `btn-${this.variant()}`,
      this.size() === 'md' ? '' : `btn-${this.size()}`,
      this.block() ? 'btn-block' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}

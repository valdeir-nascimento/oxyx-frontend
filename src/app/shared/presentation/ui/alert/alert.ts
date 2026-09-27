import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** Natureza da mensagem. Decide a cor, o ícone e a urgência anunciada. */
export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const ICONS: Record<AlertVariant, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
};

/**
 * Aviso que fica na página enquanto a condição existir, com o `.alert` do design system.
 *
 * `danger` anuncia com `role="alert"`, que interrompe a leitura de quem usa leitor de tela; as
 * demais variantes usam `role="status"`, que espera a vez. A distinção é deliberada: marcar tudo
 * como urgente treina a pessoa a ignorar o que é urgente de verdade. Para confirmar uma ação que
 * acabou de dar certo, o design system usa o toast, e não o aviso.
 *
 * A variante também aparece como `data-variant` e como ícone próprio, porque uma mensagem que só se
 * distingue pela cor não é distinguida por quem não enxerga cor. `danger` é extensão do Ovyx sobre
 * as cores de perigo do design system (extensions.css).
 */
@Component({
  selector: 'ovyx-alert',
  imports: [Icon],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alert {
  readonly variant = input<AlertVariant>('info');

  protected readonly role = computed(() => (this.variant() === 'danger' ? 'alert' : 'status'));

  protected readonly icon = computed(() => ICONS[this.variant()]);
}

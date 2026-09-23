import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Natureza da mensagem. Decide a cor, a forma do ícone e a urgência anunciada. */
export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

/**
 * Mensagem dirigida a quem está na tela.
 *
 * `danger` anuncia com `role="alert"`, que interrompe a leitura de quem usa leitor de tela; as
 * demais variantes usam `role="status"`, que espera a vez. A distinção é deliberada: marcar tudo
 * como urgente treina a pessoa a ignorar o que é urgente de verdade.
 *
 * A variante também aparece como `data-variant` e como ícone de forma própria, porque uma mensagem
 * de erro que só se distingue pelo tom de vermelho não é distinguida por quem não enxerga cor.
 */
@Component({
  selector: 'ovyx-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert" [attr.data-variant]="variant()" [attr.role]="role()">
      <span class="alert__icon" aria-hidden="true"></span>
      <div class="alert__content">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    /* Elemento personalizado nasce inline. Nas telas de hoje funciona por acaso, porque o
     * pai é sempre uma grade; num fluxo normal o componente encolheria no conteúdo. */
    :host {
      display: block;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: var(--ovyx-space-3);
      padding: var(--ovyx-space-3);
      border: var(--ovyx-border-width-thin) solid;
      border-radius: var(--ovyx-radius-sm);
      font-size: var(--ovyx-font-size-md);
    }

    .alert__icon {
      flex: none;
      width: var(--ovyx-space-5);
      height: var(--ovyx-space-5);
      border: var(--ovyx-border-width-thick) solid currentcolor;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--ovyx-font-size-sm);
      font-weight: var(--ovyx-font-weight-bold);
    }

    .alert__content {
      display: grid;
      gap: var(--ovyx-space-1);
    }

    .alert[data-variant='info'] {
      background-color: var(--ovyx-color-info-surface);
      border-color: var(--ovyx-color-info-border);
      color: var(--ovyx-color-info-text);
    }

    /* Círculo com "i": a informação. */
    .alert[data-variant='info'] .alert__icon {
      border-radius: var(--ovyx-radius-pill);
    }

    .alert[data-variant='info'] .alert__icon::before {
      content: 'i';
    }

    .alert[data-variant='success'] {
      background-color: var(--ovyx-color-success-surface);
      border-color: var(--ovyx-color-success-border);
      color: var(--ovyx-color-success-text);
    }

    /* Círculo com um visto: concluído. */
    .alert[data-variant='success'] .alert__icon {
      border-radius: var(--ovyx-radius-pill);
    }

    .alert[data-variant='success'] .alert__icon::before {
      content: '\\2713';
    }

    .alert[data-variant='warning'] {
      background-color: var(--ovyx-color-warning-surface);
      border-color: var(--ovyx-color-warning-border);
      color: var(--ovyx-color-warning-text);
    }

    /* Quadrado apoiado no vértice, com "!": atenção. */
    .alert[data-variant='warning'] .alert__icon {
      transform: rotate(45deg);
    }

    .alert[data-variant='warning'] .alert__icon::before {
      content: '!';
      transform: rotate(-45deg);
    }

    .alert[data-variant='danger'] {
      background-color: var(--ovyx-color-danger-surface);
      border-color: var(--ovyx-color-danger-border);
      color: var(--ovyx-color-danger-text);
    }

    /* Quadrado com um xis: a operação não aconteceu. */
    .alert[data-variant='danger'] .alert__icon::before {
      content: '\\00D7';
    }
  `,
})
export class Alert {
  readonly variant = input<AlertVariant>('info');

  /** `alert` interrompe a leitura; `status` espera a vez. Só a falha merece interromper. */
  protected readonly role = computed(() => (this.variant() === 'danger' ? 'alert' : 'status'));
}

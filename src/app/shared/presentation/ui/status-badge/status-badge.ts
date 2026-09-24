import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** `positive` para o estado em vigor (ativo); `neutral` para o resto. */
export type StatusBadgeTone = 'positive' | 'neutral';

/**
 * Selo de situação, como ativo e inativo na lista de responsáveis.
 *
 * O texto é quem diz o estado. A marca ao lado repete isso pela forma — cheia no `positive`, vazada
 * no `neutral` —, para que o selo não dependa de cor.
 */
@Component({
  selector: 'ovyx-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [attr.data-tone]="tone()">
      <span class="badge__mark" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--ovyx-space-1);
      padding: 0 var(--ovyx-space-2);
      border: var(--ovyx-border-width-thin) solid;
      border-radius: var(--ovyx-radius-pill);
      font-size: var(--ovyx-font-size-sm);
      white-space: nowrap;
    }

    .badge__mark {
      width: var(--ovyx-space-2);
      height: var(--ovyx-space-2);
      border: var(--ovyx-border-width-thick) solid currentcolor;
      border-radius: var(--ovyx-radius-pill);
    }

    .badge[data-tone='positive'] {
      background-color: var(--ovyx-color-success-surface);
      border-color: var(--ovyx-color-success-border);
      color: var(--ovyx-color-success-text);
    }

    .badge[data-tone='positive'] .badge__mark {
      background-color: currentcolor;
    }

    .badge[data-tone='neutral'] {
      background-color: var(--ovyx-color-surface-sunken);
      border-color: var(--ovyx-color-border);
      color: var(--ovyx-color-text-muted);
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<StatusBadgeTone>('neutral');
}

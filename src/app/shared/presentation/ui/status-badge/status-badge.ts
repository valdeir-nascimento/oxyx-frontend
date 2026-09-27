import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tom do selo, os do design system: `success` para o estado normal ou completo, `warning` para o
 * pendente, `danger` para o crítico, `primary` para destaque de perfil, e `neutral` para o resto.
 */
export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'accent' | 'neutral';

/**
 * Selo de situação, com o `.badge` do design system — ativo e inativo, administrador e usuário.
 *
 * O texto é quem diz o estado; o ponto ao lado e a cor reforçam, mas não substituem, o texto. O
 * tom também aparece como `data-tone`.
 */
@Component({
  selector: 'ovyx-status-badge',
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly label = input.required<string>();

  readonly tone = input<StatusBadgeTone>('neutral');

  protected toneClass(): string {
    return this.tone() === 'neutral' ? 'badge' : `badge b-${this.tone()}`;
  }
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Tom do avatar, para linhas vizinhas não repetirem a mesma cor. É só decoração. */
export type AvatarTone = 'gema' | 'capim' | 'ceu';

/** Iniciais das duas primeiras palavras do nome: "Maria Silva" vira "MS". */
export function initialsOf(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Avatar com as iniciais, o `.avatar` do design system.
 *
 * Decorativo (`aria-hidden`): o nome completo sempre aparece em texto ao lado, e o leitor de tela o
 * lê de lá — ler "M S" antes do nome só atrapalharia.
 */
@Component({
  selector: 'ovyx-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly name = input.required<string>();

  /** 30 px em vez de 34, para linha de tabela e barra superior. */
  readonly small = input(false);

  readonly tone = input<AvatarTone>('gema');

  protected readonly initials = computed(() => initialsOf(this.name()));
}

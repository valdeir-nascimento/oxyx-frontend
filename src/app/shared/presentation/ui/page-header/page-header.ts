import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabeçalho de página com o `.page-head` do design system: sobretítulo, título, subtítulo e as ações
 * da página ao lado.
 *
 * O título é o `<h1>` da tela. No celular, as ações descem para baixo do título e se esticam, como o
 * design system define.
 *
 * ```html
 * <ovyx-page-header eyebrow="Administração" title="Responsáveis" subtitle="Quem pode entrar no sistema.">
 *   <a class="btn btn-primary" routerLink="novo">Novo responsável</a>
 * </ovyx-page-header>
 * ```
 */
@Component({
  selector: 'ovyx-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly title = input.required<string>();

  /** A área a que a página pertence, acima do título, como "Administração". */
  readonly eyebrow = input<string>();

  /** Uma frase sobre o que a página faz. */
  readonly subtitle = input<string>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabeçalho de página com ação: o título é o `<h1>` da tela, e as ações projetadas ficam ao lado.
 *
 * No telefone as ações descem para baixo do título, em vez de disputarem a mesma linha.
 *
 * ```html
 * <ovyx-page-header title="Responsáveis">
 *   <a routerLink="novo">Novo responsável</a>
 * </ovyx-page-header>
 * ```
 */
@Component({
  selector: 'ovyx-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h1 class="page-header__title">{{ title() }}</h1>
      <div class="page-header__actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ovyx-space-3);
      margin-bottom: var(--ovyx-space-4);
    }

    .page-header__title {
      font-size: var(--ovyx-font-size-2xl);
      font-weight: var(--ovyx-font-weight-bold);
      line-height: var(--ovyx-line-height-tight);
    }

    .page-header__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ovyx-space-2);
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
}

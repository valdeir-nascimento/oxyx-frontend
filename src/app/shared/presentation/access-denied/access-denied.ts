import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Tela de acesso negado (FR-010).
 *
 * Deliberadamente genérica: não diz qual recurso foi negado, nem que ele existe. O backend omite
 * essa informação no 403 justamente para não confirmar a existência de área administrativa a quem
 * está sondando o sistema — repetir aqui o que lá foi omitido desfaria a proteção.
 */
@Component({
  selector: 'ovyx-access-denied',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="access-denied">
      <h1 class="access-denied__title">Acesso negado</h1>
      <p>Você não tem permissão para executar esta operação.</p>
      <a class="access-denied__link" routerLink="/">Voltar ao início</a>
    </section>
  `,
  styles: `
    .access-denied {
      display: grid;
      justify-items: center;
      gap: var(--ovyx-space-4);
      /* A largura desconta a calha dos dois lados: sem isto, o cartão encosta na
       * borda do telefone. O topo encolhe no telefone, senão o formulário nasce
       * abaixo da primeira dobra. */
      width: calc(100% - 2 * var(--ovyx-layout-gutter));
      max-width: var(--ovyx-layout-prose-max);
      margin: var(--ovyx-layout-page-top) auto;
      padding: var(--ovyx-space-5);
      text-align: center;
    }

    .access-denied__title {
      font-size: var(--ovyx-font-size-2xl);
      font-weight: var(--ovyx-font-weight-bold);
      line-height: var(--ovyx-line-height-tight);
    }

    .access-denied__link {
      display: inline-flex;
      align-items: center;
      min-height: var(--ovyx-control-height-md);
      padding: 0 var(--ovyx-space-2);
      color: var(--ovyx-color-brand-text);
    }
  `,
})
export class AccessDenied {}

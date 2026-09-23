import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Página inicial da área autenticada.
 *
 * Nesta fatia a fundação de acesso é o que existe: o conteúdo de avicultura chega nas features
 * seguintes. Ela existe para que a entrada leve a algum lugar, e não a um conteúdo vazio.
 */
@Component({
  selector: 'ovyx-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="home">
      <h1 class="home__title">Início</h1>
      <p>Bem-vindo ao Ovyx. Use a navegação acima para acessar as áreas disponíveis.</p>
    </section>
  `,
  styles: `
    .home {
      display: grid;
      gap: var(--ovyx-space-2);
    }

    .home__title {
      font-size: var(--ovyx-font-size-2xl);
      font-weight: var(--ovyx-font-weight-bold);
      line-height: var(--ovyx-line-height-tight);
    }
  `,
})
export class Home {}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from '../navigation/navigation';
import { Button } from '../ui/button/button';

/**
 * Casca da aplicação autenticada: cabeçalho com identificação, navegação e a área de conteúdo.
 *
 * Recebe tudo por entrada e avisa a saída por evento. Não conhece serviço de identidade, não faz
 * chamada HTTP e não decide nada de negócio — o princípio I vale igual no cliente, e é o contexto
 * `identity` que liga este componente aos dados reais.
 */
@Component({
  selector: 'ovyx-authenticated-layout',
  imports: [RouterOutlet, Navigation, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <span class="topbar__brand">Ovyx</span>
      <ovyx-navigation class="topbar__nav" [role]="role()" />
      <div class="topbar__identity">
        <span class="topbar__name">{{ fullName() }}</span>
        <span class="topbar__role">{{ roleLabel() }}</span>
        <ovyx-button variant="secondary" (pressed)="signOut.emit()">Sair</ovyx-button>
      </div>
    </header>

    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    /* Duas linhas no telefone — marca e identificação em cima, navegação embaixo —
     * e uma linha só a partir de 48rem. A grade nomeia as áreas em vez de mexer na
     * ordem do template: o HTML continua marca, navegação e identificação, que é a
     * ordem em que o teclado percorre a barra. */
    .topbar {
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-areas:
        'brand identity'
        'nav nav';
      align-items: center;
      gap: var(--ovyx-space-3) var(--ovyx-space-5);
      padding: var(--ovyx-space-3) var(--ovyx-layout-gutter);
      background-color: var(--ovyx-color-surface-raised);
      border-bottom: var(--ovyx-border-width-thin) solid var(--ovyx-color-border);
    }

    .topbar__brand {
      grid-area: brand;
      font-size: var(--ovyx-font-size-lg);
      font-weight: var(--ovyx-font-weight-bold);
      color: var(--ovyx-color-brand-text);
    }

    .topbar__identity {
      grid-area: identity;
      justify-self: end;
      display: flex;
      align-items: center;
      gap: var(--ovyx-space-3);
    }

    .topbar__name {
      font-weight: var(--ovyx-font-weight-medium);
    }

    /* O perfil é apoio, não título: distingue-se por tamanho e por tom de texto com contraste
     * medido, e não por uma opacidade que o apaga sob luz forte. */
    .topbar__role {
      font-size: var(--ovyx-font-size-sm);
      color: var(--ovyx-color-text-muted);
    }

    /* A coluna precisa de min-width zero porque uma grade dá à coluna o tamanho do
     * conteúdo mínimo: sem isto, uma navegação larga estica a barra inteira em vez
     * de rolar dentro da própria área. */
    .topbar__nav {
      grid-area: nav;
      min-width: 0;
    }

    @media (min-width: 48rem) {
      .topbar {
        grid-template-columns: auto 1fr auto;
        grid-template-areas: 'brand nav identity';
      }
    }

    .content {
      max-width: var(--ovyx-layout-content-max);
      margin: 0 auto;
      padding: var(--ovyx-space-5) var(--ovyx-layout-gutter);
    }
  `,
})
export class AuthenticatedLayout {
  readonly fullName = input.required<string>();
  readonly role = input.required<'ADMINISTRATOR' | 'USER'>();

  /** Emitido quando o responsável escolhe sair; o contexto identity executa o encerramento. */
  readonly signOut = output<void>();

  protected roleLabel(): string {
    return this.role() === 'ADMINISTRATOR' ? 'Administrador' : 'Usuário';
  }
}

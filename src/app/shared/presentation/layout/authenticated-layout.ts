import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FocusTrap } from '../ui/focus-trap/focus-trap';
import { BottomNav } from './bottom-nav/bottom-nav';
import { MenuItem } from './menu-item';
import { SideNav } from './side-nav/side-nav';
import { TopBar } from './top-bar/top-bar';

/** O caminho da página em vigor: o `data.crumbs` da rota mais funda que o declara. */
export function crumbsOf(root: ActivatedRouteSnapshot): readonly string[] {
  let crumbs: readonly string[] = [];
  for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
    const declared = route.data['crumbs'] as readonly string[] | undefined;
    if (declared) {
      crumbs = declared;
    }
  }
  return crumbs;
}

/**
 * Casca da aplicação autenticada, o `.app` do design system: menu lateral, barra superior, conteúdo
 * e, no celular, a navegação inferior e a gaveta.
 *
 * Recebe tudo por entrada e avisa a saída por evento. Não conhece serviço de identidade, não faz
 * chamada HTTP e não decide nada de negócio — o princípio I vale igual no cliente, e é o contexto
 * `identity` que liga este componente aos dados reais.
 *
 * A largura quem mede é o contêiner `.av-app-root`, e não a janela: o design system responde por
 * container queries. A gaveta do celular é o mesmo menu lateral, modal: o foco fica preso nela, o
 * Esc e o clique fora a fecham, e navegar para outra área também.
 */
@Component({
  selector: 'ovyx-authenticated-layout',
  imports: [RouterOutlet, BottomNav, FocusTrap, SideNav, TopBar],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthenticatedLayout {
  readonly fullName = input.required<string>();

  /** O perfil já em português; o layout não conhece perfil (T233). */
  readonly roleLabel = input.required<string>();

  /** Os itens que quem está na sessão pode ver. */
  readonly menuItems = input.required<readonly MenuItem[]>();

  /** Emitido quando o responsável escolhe sair; o contexto identity executa o encerramento. */
  readonly signOut = output<void>();

  protected readonly drawerId = 'ovyx-drawer';

  protected readonly drawerOpen = signal(false);

  private readonly router = inject(Router);

  protected readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => crumbsOf(this.router.routerState.snapshot.root)),
    ),
    { initialValue: crumbsOf(this.router.routerState.snapshot.root) },
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.drawerOpen.set(false));
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected closeFromScrim(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDrawer();
    }
  }
}

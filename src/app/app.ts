import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastStack } from './shared/presentation/ui/toast/toast-stack';

/**
 * Raiz da aplicação: o contêiner `.av-app-root`, pelo qual o design system mede a largura (container
 * queries), e a pilha de toasts, que sobrevive à troca de tela. A casca autenticada é montada pelo
 * contexto identity.
 */
@Component({
  selector: 'ovyx-root',
  imports: [RouterOutlet, ToastStack],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}

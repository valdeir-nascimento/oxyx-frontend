import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Brand } from '../../ui/brand/brand';

/**
 * Layout das telas fora da casca — entrar e trocar a senha provisória —, o `.login` do design
 * system: o painel da marca à esquerda e o formulário projetado à direita. Abaixo de 760 px o painel
 * encolhe para o topo.
 *
 * O formulário projetado leva a classe `login-form`. A frase do painel é um parágrafo, e não um
 * título: o `<h1>` da tela é o do formulário ("Entrar"), que é o que a pessoa veio fazer.
 */
@Component({
  selector: 'ovyx-auth-layout',
  imports: [Brand],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}

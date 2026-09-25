import { InjectionToken, Signal, signal } from '@angular/core';

/**
 * Quem está vendo a tela, no que ela precisa saber para decidir o que oferecer.
 *
 * Fica no `shared` porque as telas dos contextos precisam do perfil, e nenhum contexto pode depender
 * do `identity` para isso (R-008 da feature 002, espelhado no cliente). Quem sabe o perfil é a
 * sessão, e o `identity` fornece a implementação.
 *
 * Esconder uma ação não é a proteção — quem protege é o backend, que responde 403. Isto evita oferecer
 * um caminho que terminaria em recusa.
 */
export interface Viewer {
  /** Se quem vê pode cadastrar, editar, inativar e reativar (FR-018). */
  readonly isAdministrator: Signal<boolean>;
}

/**
 * O perfil de quem vê. Sem ninguém que o diga, a tela não oferece nada que altere: o padrão seguro é
 * não oferecer o que o backend recusaria.
 */
export const VIEWER = new InjectionToken<Viewer>('Viewer', {
  providedIn: 'root',
  factory: () => ({ isAdministrator: signal(false).asReadonly() }),
});

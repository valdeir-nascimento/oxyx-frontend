import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Raiz da aplicação. A casca autenticada é montada pelo contexto identity, a partir da História 1. */
@Component({
  selector: 'ovyx-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
})
export class App {}

import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { ThemeDisplay } from '../application/theme-display';
import { THEME_STORAGE_KEY, ThemePreference, isThemePreference, themeAttributeOf } from '../domain/theme-preference';

/**
 * O tema aplicado no documento (R-006 da 011): o `data-theme` no `<html>` e a última escolha no `localStorage`, que
 * guarda só o tema, sem nada que identifique a pessoa.
 *
 * O armazenamento pode estar bloqueado (navegação privada, política do navegador): todo acesso a ele fica num
 * `try/catch`, e o tema na tela é aplicado do mesmo jeito. A escolha feita em outra aba chega pelo evento `storage`.
 *
 * O tema em vigor nasce do lembrado no navegador, que o script em linha do `index.html` já pôs na tela antes do
 * Angular, e muda a cada tema pintado, venha ele desta aba ou de outra.
 */
@Injectable({ providedIn: 'root' })
export class DocumentThemeDisplay implements ThemeDisplay {
  private readonly document = inject(DOCUMENT);
  private readonly painted = signal<ThemePreference>(this.remembered());

  readonly current = this.painted.asReadonly();

  constructor() {
    this.document.defaultView?.addEventListener('storage', (event) => {
      if (event.key === THEME_STORAGE_KEY && isThemePreference(event.newValue)) {
        this.paint(event.newValue);
      }
    });
  }

  apply(preference: ThemePreference): void {
    this.paint(preference);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Sem armazenamento, a escolha vale só nesta tela; o tema já está aplicado.
    }
  }

  /** A última escolha lembrada no navegador; `SYSTEM` quando não há nenhuma ou o armazenamento está bloqueado. */
  private remembered(): ThemePreference {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
      return isThemePreference(stored) ? stored : 'SYSTEM';
    } catch {
      return 'SYSTEM';
    }
  }

  private paint(preference: ThemePreference): void {
    const attribute = themeAttributeOf(preference);
    const html = this.document.documentElement;
    if (attribute === null) {
      delete html.dataset['theme'];
    } else {
      html.dataset['theme'] = attribute;
    }
    this.painted.set(preference);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ThemePreference } from '../../../domain/theme-preference';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** Uma opção do seletor: o tema, o rótulo em português e o ícone. */
interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
  readonly icon: IconName;
}

const OPTIONS: readonly ThemeOption[] = [
  { value: 'LIGHT', label: 'Claro', icon: 'sun' },
  { value: 'DARK', label: 'Escuro', icon: 'moon' },
  { value: 'SYSTEM', label: 'Igual ao sistema', icon: 'monitor' },
];

let nextId = 0;

/**
 * O seletor de tema do topo (R-005 da 011): o `theme-btn` do protótipo, com a terceira opção, "Igual ao sistema".
 *
 * O botão mostra o ícone do tema escolhido e abre as três opções, no padrão de menu de opções exclusivas
 * (`menuitemradio` com `aria-checked`). Pelo teclado, o foco vai para a opção marcada; as setas e o Home/End
 * navegam; o Enter e o Espaço escolhem; o Esc fecha. Escolher, ou fechar, devolve o foco ao botão. O clique fora
 * fecha.
 *
 * Não sabe de conta nem de onde o tema fica guardado: recebe o `value` e avisa a escolha em `valueChange`.
 */
@Component({
  selector: 'ovyx-theme-picker',
  imports: [Icon],
  templateUrl: './theme-picker.html',
  styleUrl: './theme-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'closeIfOutside($event)' },
})
export class ThemePicker {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly value = input.required<ThemePreference>();
  readonly valueChange = output<ThemePreference>();

  protected readonly options = OPTIONS;
  protected readonly listId = `ovyx-theme-menu-${nextId++}`;
  protected readonly open = signal(false);
  /** A opção que tem o foco na lista aberta. */
  protected readonly active = signal(0);

  protected readonly current = computed(
    () => OPTIONS.find((option) => option.value === this.value()) ?? OPTIONS[2],
  );

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.active.set(OPTIONS.indexOf(this.current()));
    this.open.set(true);
    this.focusActiveAfterRender();
  }

  protected choose(value: ThemePreference): void {
    this.close();
    this.valueChange.emit(value);
  }

  protected onKey(event: KeyboardEvent): void {
    const last = OPTIONS.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        this.moveTo(this.active() === last ? 0 : this.active() + 1);
        break;
      case 'ArrowUp':
        this.moveTo(this.active() === 0 ? last : this.active() - 1);
        break;
      case 'Home':
        this.moveTo(0);
        break;
      case 'End':
        this.moveTo(last);
        break;
      case 'Enter':
      case ' ':
        this.choose(OPTIONS[this.active()].value);
        break;
      case 'Escape':
        this.close();
        break;
      case 'Tab':
        // O foco segue para o próximo elemento da página; a lista não fica aberta para trás.
        this.open.set(false);
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  protected closeIfOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private moveTo(index: number): void {
    this.active.set(index);
    this.optionElements()[index]?.focus();
  }

  /** Fecha a lista e devolve o foco ao botão, de onde a pessoa veio. */
  private close(): void {
    this.open.set(false);
    this.host.nativeElement.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus();
  }

  private focusActiveAfterRender(): void {
    afterNextRender(() => this.optionElements()[this.active()]?.focus(), {
      injector: this.injector,
    });
  }

  private optionElements(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    );
  }
}

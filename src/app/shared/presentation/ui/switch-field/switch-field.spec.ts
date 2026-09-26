import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwitchField } from './switch-field';

/**
 * Chave liga-desliga, o `.switch` do design system: uma caixa de marcação nativa com rótulo, que o
 * teclado alcança e opera, e o leitor de tela anuncia como chave.
 */
describe('SwitchField', () => {
  let fixture: ComponentFixture<SwitchField>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function input(): HTMLInputElement {
    return element().querySelector<HTMLInputElement>('input')!;
  }

  function render(checked = false): void {
    TestBed.configureTestingModule({ imports: [SwitchField] });
    fixture = TestBed.createComponent(SwitchField);
    fixture.componentRef.setInput('controlId', 'onlyOccurrences');
    fixture.componentRef.setInput('label', 'Só gaiolas com ocorrência');
    fixture.componentRef.setInput('checked', checked);
    fixture.detectChanges();
  }

  it('is a native checkbox announced as a switch, named by its label, in the switch style', () => {
    render();

    expect(element().querySelector('label.switch')?.textContent?.trim()).toBe('Só gaiolas com ocorrência');
    expect(input().type).toBe('checkbox');
    expect(input().getAttribute('role')).toBe('switch');
    expect(input().id).toBe('onlyOccurrences');
    expect(input().labels?.[0]?.textContent?.trim()).toBe('Só gaiolas com ocorrência');
  });

  it('stays in the tab order, where the keyboard reaches and operates it', () => {
    render();

    expect(input().tabIndex).toBe(0);
    expect(input().disabled).toBe(false);
  });

  it('shows the state it receives', () => {
    render(true);

    expect(input().checked).toBe(true);
  });

  it('tells the change when it is turned on and off', () => {
    render();
    const changes: boolean[] = [];
    fixture.componentInstance.checked.subscribe((checked) => changes.push(checked));

    input().click();
    input().click();

    expect(changes).toEqual([true, false]);
  });
});

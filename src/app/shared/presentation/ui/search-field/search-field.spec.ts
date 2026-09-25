import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SearchField } from './search-field';

/** Busca da barra de ferramentas: sem rótulo visível, o nome vai em aria-label. */
describe('SearchField', () => {
  const control = new FormControl('', { nonNullable: true });

  function render(): HTMLInputElement {
    TestBed.configureTestingModule({ imports: [SearchField] });
    const fixture = TestBed.createComponent(SearchField);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('label', 'Buscar por nome');
    fixture.componentRef.setInput('placeholder', 'Buscar por nome');
    fixture.componentRef.setInput('controlId', 'name');
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('input')!;
  }

  beforeEach(() => control.setValue(''));

  it('is a search input named for the screen reader', () => {
    const input = render();

    expect(input.type).toBe('search');
    expect(input.getAttribute('aria-label')).toBe('Buscar por nome');
    expect(input.id).toBe('name');
  });

  it('writes what is typed into the control, without searching by itself', () => {
    const input = render();

    input.value = 'pereira';
    input.dispatchEvent(new Event('input'));

    expect(control.value).toBe('pereira');
  });
});

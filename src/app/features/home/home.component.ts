import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { projectDefinitions } from '../../project-definitions';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly year = new Date().getFullYear();
  protected readonly query = signal('');
  protected readonly projects = projectDefinitions;
  private readonly filterInput =
    viewChild<ElementRef<HTMLInputElement>>('filterInput');
  protected readonly filteredProjects = computed(() => {
    const normalizedQuery = this.query().trim().toLowerCase();

    if (!normalizedQuery) {
      return this.projects;
    }

    return this.projects.filter((project) => {
      const haystack = `${project.title} ${project.tags.join(' ')} ${project.summary}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  });

  protected updateQuery(value: string): void {
    this.query.set(value);
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected handleWindowKeydown(event: KeyboardEvent): void {
    const input = this.filterInput()?.nativeElement;
    if (!input) {
      return;
    }

    if (event.key === '/' && this.shouldFocusFilter(input)) {
      event.preventDefault();
      input.focus();
      return;
    }

    if (event.key === 'Escape' && document.activeElement === input) {
      this.query.set('');
      input.blur();
    }
  }

  private shouldFocusFilter(input: HTMLInputElement): boolean {
    return document.activeElement !== input;
  }
}

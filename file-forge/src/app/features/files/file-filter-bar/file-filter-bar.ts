import { Component, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { FileExtension } from '@app/core/models';

export type SearchScope = 'folder' | 'all';

export interface FileFilterState {
  search: string;
  extension: FileExtension | '';
  dateFrom: string;
  dateTo: string;
  scope: SearchScope;
}

export const DEFAULT_FILTERS: FileFilterState = {
  search: '',
  extension: '',
  dateFrom: '',
  dateTo: '',
  scope: 'folder'
};

@Component({
  selector: 'app-file-filter-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './file-filter-bar.html',
  styleUrl: './file-filter-bar.scss'
})
export class FileFilterBar {
  private readonly fb = inject(NonNullableFormBuilder);

  /** Emite solo filtros válidos, con 300 ms de espera. */
  readonly changed = output<FileFilterState>();

  protected readonly form = this.fb.group({
    search: [DEFAULT_FILTERS.search],
    extension: [DEFAULT_FILTERS.extension],
    dateFrom: [DEFAULT_FILTERS.dateFrom],
    dateTo: [DEFAULT_FILTERS.dateTo],
    scope: [DEFAULT_FILTERS.scope]
  });

  protected readonly rangeInvalid = signal(false);

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly active = computed(() => {
    const v = this.value();
    return !!(v.search || v.extension || v.dateFrom || v.dateTo || v.scope !== 'folder');
  });

  constructor() {
    this.form.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      const v = this.form.getRawValue();
      const invalid = !!v.dateFrom && !!v.dateTo && v.dateFrom > v.dateTo;
      this.rangeInvalid.set(invalid);
      if (!invalid) {
        this.changed.emit({ ...v, search: v.search.trim() });
      }
    });
  }

  clear(): void {
    this.form.reset();
  }
}
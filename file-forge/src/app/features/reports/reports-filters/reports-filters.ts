import { Component, effect, input, output, signal } from '@angular/core';
import { ReportPeriod, User } from '@app/core/models';

export interface ReportsFilterConfig {
  dates: boolean;
  limit: boolean;
  period: boolean;
  users: boolean;
}

export interface ReportsFilterValue {
  from?: string;
  to?: string;
  limit?: number;
  period?: ReportPeriod;
  userId?: string;
}

@Component({
  selector: 'app-reports-filters',
  templateUrl: './reports-filters.html',
  styleUrl: './reports-filters.scss',
})
export class ReportsFilters {
  readonly config = input.required<ReportsFilterConfig>();
  readonly users = input<User[]>([]);
  readonly applied = output<ReportsFilterValue>();
  readonly cleared = output<void>();

  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly limit = signal(10);
  protected readonly period = signal<ReportPeriod>('day');
  protected readonly userId = signal('');
  protected readonly dateError = signal<string | null>(null);

  protected readonly limitOptions = [5, 10, 25, 50];
  protected readonly periodOptions: { value: ReportPeriod; label: string }[] = [
    { value: 'day', label: 'Por día' },
    { value: 'week', label: 'Por semana' },
    { value: 'month', label: 'Por mes' },
  ];

  constructor() {
    effect(() => {
      this.config();
      this.from.set('');
      this.to.set('');
      this.limit.set(10);
      this.period.set('day');
      this.userId.set('');
      this.dateError.set(null);
    });

    effect(() => {
      const list = this.users();
      if (this.config().users && list.length && !list.some(u => u.id === this.userId())) {
        this.userId.set(list[0].id);
      }
    });
  }

  protected onFromChange(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  protected onToChange(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  protected onLimitChange(event: Event): void {
    this.limit.set(Number((event.target as HTMLSelectElement).value));
  }

  protected onPeriodChange(event: Event): void {
    this.period.set((event.target as HTMLSelectElement).value as ReportPeriod);
  }

  protected onUserChange(event: Event): void {
    this.userId.set((event.target as HTMLSelectElement).value);
  }

  protected apply(): void {
    const cfg = this.config();
    const from = cfg.dates ? this.from() : '';
    const to = cfg.dates ? this.to() : '';
    if (from && to && from > to) {
      this.dateError.set('El rango de fechas es inválido');
      return;
    }
    this.dateError.set(null);
    this.applied.emit({
      from: from || undefined,
      to: to || undefined,
      limit: cfg.limit ? this.limit() : undefined,
      period: cfg.period ? this.period() : undefined,
      userId: cfg.users ? this.userId() || undefined : undefined,
    });
  }

  protected clear(): void {
    this.from.set('');
    this.to.set('');
    this.limit.set(10);
    this.period.set('day');
    this.userId.set('');
    this.dateError.set(null);
    this.cleared.emit();
  }

  protected hasValue(): boolean {
    return !!(this.from() || this.to() || this.userId());
  }
}

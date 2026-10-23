import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { FileSizePipe } from '@app/shared/pipes/file-size-pipe';

export type ReportColumnField = 'label' | 'sublabel' | 'count' | 'size' | 'percent' | 'owner' | 'permission' | 'date';
export type ReportColumnType = 'text' | 'date' | 'count' | 'size' | 'percent' | 'bar';

export interface ReportColumn {
  field: ReportColumnField;
  label: string;
  type: ReportColumnType;
}

export interface ReportRowVM {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  size?: number;
  percent?: number;
  owner?: string;
  permission?: string;
  date?: string;
}

@Component({
  selector: 'app-reports-table',
  imports: [DatePipe, FileSizePipe],
  templateUrl: './reports-table.html',
  styleUrl: './reports-table.scss',
})
export class ReportsTable {
  readonly columns = input.required<ReportColumn[]>();
  readonly rows = input.required<ReportRowVM[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly empty = computed(() => !this.loading() && !this.error() && this.rows().length === 0);

  protected readonly totalCount = computed(() => this.rows().reduce((s, r) => s + r.count, 0));
  protected readonly totalSize = computed(() => this.rows().reduce((s, r) => s + (r.size ?? 0), 0));

  protected readonly maxMetric = computed(() =>
    Math.max(1, ...this.rows().map(r => this.metric(r))));

  protected isNum(column: ReportColumn): boolean {
    return column.type === 'count' || column.type === 'size' || column.type === 'percent';
  }

  protected isTotal(column: ReportColumn): boolean {
    return column.type === 'count' || column.type === 'size';
  }

  protected display(row: ReportRowVM, column: ReportColumn): string | number {
    switch (column.field) {
      case 'label': return row.label;
      case 'sublabel': return row.sublabel ?? '';
      case 'count': return row.count;
      case 'size': return row.size ?? 0;
      case 'percent': return `${row.percent ?? 0}%`;
      case 'owner': return row.owner ?? '';
      case 'permission': return row.permission ?? '';
      case 'date': return row.date ?? '';
    }
  }

  protected sizeOf(row: ReportRowVM): number {
    return row.size ?? 0;
  }

  protected percent(row: ReportRowVM): number {
    return row.percent ?? 0;
  }

  protected barWidth(row: ReportRowVM): string {
    return `${Math.round((this.metric(row) / this.maxMetric()) * 100)}%`;
  }

  private metric(row: ReportRowVM): number {
    return this.columns().some(c => c.type === 'size') ? (row.size ?? 0) : row.count;
  }
}

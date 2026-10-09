import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss'
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageSizeOptions = input<number[]>([5, 10, 20]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize()))
  );
  protected readonly from = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1
  );
  protected readonly to = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total())
  );
}
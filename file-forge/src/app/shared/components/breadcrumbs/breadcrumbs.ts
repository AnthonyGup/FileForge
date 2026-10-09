import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbItem } from '@app/core/models';

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss'
})
export class Breadcrumbs {
  readonly items = input.required<BreadcrumbItem[]>();

  protected link(item: BreadcrumbItem): string[] {
    return item.id ? ['/explorer', item.id] : ['/explorer'];
  }
}
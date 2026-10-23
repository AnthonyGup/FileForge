import { Component, computed, input } from '@angular/core';
import { UI_PATHS, UiIconName } from '../ui-icons';

@Component({
  selector: 'app-ui-icon',
  templateUrl: './ui-icon.html',
  styleUrl: './ui-icon.scss'
})
export class UiIcon {
  readonly name = input.required<UiIconName>();
  protected readonly paths = computed(() => UI_PATHS[this.name()]);
}

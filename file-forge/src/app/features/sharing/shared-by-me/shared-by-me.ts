import { Component } from '@angular/core';
import { ShareList } from '../share-list/share-list';

@Component({
  selector: 'app-shared-by-me',
  imports: [ShareList],
  templateUrl: './shared-by-me.html',
  styleUrl: './shared-by-me.scss',
})
export class SharedByMe {}

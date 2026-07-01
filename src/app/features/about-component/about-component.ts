import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-component',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about-component.html',
  styleUrl: './about-component.scss',
})
export class AboutComponent {}

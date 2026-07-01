import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home-component/home-component').then(m => m.HomeComponent)
  },
  {
    path: 'resume',
    loadComponent: () => import('./features/resume-component/resume-component').then(m => m.ResumeComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about-component/about-component').then(m => m.AboutComponent)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];


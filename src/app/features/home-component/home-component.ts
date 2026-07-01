import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ResumeService } from '../../services/resume.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './home-component.html',
  styleUrl: './home-component.scss',
})
export class HomeComponent {
  private readonly router = inject(Router);
  public readonly resumeService = inject(ResumeService);

  buildFromScratch(): void {
    this.resumeService.resumeForm.reset();
    // Initialize with single empty array elements for initial form groups
    while (this.resumeService.experience.length) this.resumeService.experience.removeAt(0);
    while (this.resumeService.projects.length) this.resumeService.projects.removeAt(0);
    while (this.resumeService.education.length) this.resumeService.education.removeAt(0);
    while (this.resumeService.certifications.length) this.resumeService.certifications.removeAt(0);
    
    // Add default empty elements
    this.resumeService.addExperience();
    this.resumeService.addProject();
    this.resumeService.addEducation();
    
    this.router.navigate(['/resume']);
  }

  loadSample(): void {
    this.resumeService.loadSampleData();
    this.router.navigate(['/resume']);
  }

  // Trigger PDF file dialog
  triggerPdfUpload(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  // Handle selected PDF file on home screen
  onPdfSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      this.resumeService.isLoading.set(true);
      this.resumeService.loadingMessage.set('AI parsing is running. Extracting structured information from PDF...');
      this.resumeService.parsePdf(file).subscribe({
        next: (res) => {
          if (res && res.parsedData) {
            // AI parser returned structured data — populate all form fields
            this.resumeService.setResumeData(res.parsedData as any);
            this.router.navigate(['/resume']);
          } else if (res && res.extractedText) {
            // Fallback: reset form and dump raw text into summary
            this.resumeService.resumeForm.reset();
            while (this.resumeService.experience.length) this.resumeService.experience.removeAt(0);
            while (this.resumeService.projects.length) this.resumeService.projects.removeAt(0);
            while (this.resumeService.education.length) this.resumeService.education.removeAt(0);
            while (this.resumeService.certifications.length) this.resumeService.certifications.removeAt(0);

            this.resumeService.addExperience();
            this.resumeService.addProject();
            this.resumeService.addEducation();

            this.resumeService.resumeForm.patchValue({
              professionalSummary: res.extractedText
            });

            this.router.navigate(['/resume']);
          }
        },
        error: (err) => {
          console.error('Failed to parse uploaded PDF from landing page.', err);
          alert('Failed to parse PDF file. Make sure the backend server is running.');
        }
      });
    }
  }
}

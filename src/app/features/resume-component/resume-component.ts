import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResumeService } from '../../services/resume.service';
import { ResumeData, LearningRoadmap, JobMatchResult, AtsReviewResult } from '../../models/resume.model';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-resume-component',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './resume-component.html',
  styleUrl: './resume-component.scss',
})
export class ResumeComponent implements OnInit {
  public readonly resumeService = inject(ResumeService);

  // Track reactive resume data structure as a signal to avoid ExpressionChanged checks
  protected readonly resumeData = signal<ResumeData>(this.resumeService.getResumeData());

  // Preview tab: 'resume' | 'roadmap' | 'match' | 'ats'
  protected readonly activePreviewTab = signal<'resume' | 'roadmap' | 'match' | 'ats'>('resume');
  protected readonly roadmapData = signal<LearningRoadmap | null>(null);
  protected readonly roadmapTargetRole = signal<string>('');
  protected readonly roadmapJDText = signal<string>('');

  // Job matching & ATS review signals
  protected readonly matchJDText = signal<string>('');
  protected readonly jobMatchData = signal<JobMatchResult | null>(null);
  protected readonly atsReviewData = signal<AtsReviewResult | null>(null);

  // Track if AI features notice toast is open
  protected readonly showAiNotice = signal<boolean>(false);
  protected readonly aiNoticeMessage = signal<string>('');
  protected readonly aiNoticeTitle = signal<string>('Coming Soon');

  constructor() {
    // Listen to form value changes and update the signal immediately
    this.resumeService.resumeForm.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.resumeData.set(this.resumeService.getResumeData());
    });
  }

  ngOnInit(): void {
    if (this.resumeService.skipServerLoad) {
      this.resumeService.skipServerLoad = false;
      return;
    }
    // Attempt to automatically load cached data from the server on startup
    this.resumeService.isLoading.set(true);
    this.resumeService.loadingMessage.set('Loading saved resume...');
    this.resumeService.loadFromServer().subscribe({
      next: (data) => {
        if (data && data.personalInfo && data.personalInfo.fullName) {
          this.resumeData.set(data);
          this.triggerNotification('Success', 'Loaded saved resume cache from the server.');
        }
      },
      error: (err) => {
        // If 404/204, it means cache is empty, which is normal for new sessions.
        console.log('No cached resume data found on backend server.', err);
      }
    });
  }

  // Save form data to the server
  saveToServer(): void {
    if (this.resumeService.resumeForm.invalid) {
      this.triggerNotification('Validation Error', 'Please correct form validation errors before saving.');
      return;
    }

    this.resumeService.isLoading.set(true);
    this.resumeService.loadingMessage.set('Saving resume data to cloud...');
    this.resumeService.saveToServer().subscribe({
      next: () => {
        this.triggerNotification('Success', 'Resume data saved successfully to the server Cache.');
      },
      error: (err) => {
        this.triggerNotification('Error', 'Failed to save resume data. Make sure backend is running.');
        console.error(err);
      }
    });
  }

  // Handle PDF parsing trigger
  triggerPdfImport(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onPdfFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.triggerNotification('Parsing PDF', `Extracting text lines from ${file.name}...`);

      this.resumeService.isLoading.set(true);
      this.resumeService.loadingMessage.set('AI parsing is running. Extracting structured information from PDF...');
      this.resumeService.parsePdf(file).subscribe({
        next: (res) => {
          if (res && res.parsedData) {
            // AI parser returned structured data — populate all form fields at once
            this.resumeService.setResumeData(res.parsedData as any);
            this.triggerNotification('AI Parsed', 'Resume fields populated from your PDF!');
          } else if (res && res.extractedText) {
            // Fallback: dump raw text into Professional Summary
            this.resumeService.resumeForm.patchValue({
              professionalSummary: res.extractedText
            });
            this.triggerNotification('Extracted', 'Raw text loaded into Professional Summary.');
          } else {
            this.triggerNotification('Warning', 'Successfully parsed PDF, but no text could be extracted.');
          }
        },
        error: (err) => {
          this.triggerNotification('Parsing Error', 'Failed to extract text. Make sure backend is running.');
          console.error(err);
        }
      });
    }
  }

  // Trigger download PDF
  exportPdf(): void {
    this.triggerNotification('Exporting', 'Generating professional QuestPDF document...');
    this.resumeService.downloadPdfFromServer();
  }

  // Generate an AI-powered roadmap based on resume + target role + optional JD
  generateRoadmap(): void {
    const role = this.roadmapTargetRole().trim();
    if (!role) {
      this.triggerNotification('Input Required', 'Please enter a target career role.');
      return;
    }

    this.resumeService.generateRoadmap(role, this.roadmapJDText().trim()).subscribe({
      next: (res) => {
        this.roadmapData.set(res);
        this.triggerNotification('Roadmap Ready', `AI-crafted roadmap generated for "${role}"!`);
      },
      error: (err) => {
        this.triggerNotification('Error', 'Failed to generate roadmap. Check your backend server.');
        console.error(err);
      }
    });
  }

  // Export roadmap as PDF
  exportRoadmapPdf(): void {
    const roadmap = this.roadmapData();
    if (!roadmap) {
      this.triggerNotification('No Roadmap', 'Generate a roadmap first before exporting.');
      return;
    }
    this.triggerNotification('Exporting', 'Generating QuestPDF roadmap document...');
    this.resumeService.downloadRoadmapPdfFromServer(roadmap);
  }

  // Clear roadmap state
  clearRoadmap(): void {
    this.roadmapData.set(null);
    this.roadmapTargetRole.set('');
    this.roadmapJDText.set('');
  }

  // Clear current resume state and show notification
  clearResume(): void {
    this.resumeService.clearResumeData();
    this.triggerNotification('Reset Complete', 'Workspace template has been cleared.');
  }

  // Optimize professional summary using backend mock endpoint
  optimizeSummary(): void {
    const current = this.resumeService.resumeForm.get('professionalSummary')?.value || '';
    this.triggerNotification('AI Optimizer', 'Tuning summary lines...');

    this.resumeService.isLoading.set(true);
    this.resumeService.loadingMessage.set('AI is optimizing your professional summary...');
    this.resumeService.enhanceSummaryFromServer(current).subscribe({
      next: (res) => {
        this.resumeService.resumeForm.patchValue({
          professionalSummary: res.enhancedSummary
        });
        this.triggerNotification('Success', 'Summary enhanced using mock AI model!');
      },
      error: (err) => {
        this.triggerNotification('Connection Error', 'Backend service failed to respond.');
        console.error(err);
      }
    });
  }

  // Improve bullet points using backend mock endpoint
  improveBullets(expIndex: number): void {
    const achArray = this.resumeService.getExpAchievements(expIndex);
    if (!achArray || achArray.length === 0) {
      this.triggerNotification('Info', 'Please add an achievement bullet point first.');
      return;
    }

    const currentBullet = achArray.at(0).value || '';
    if (!currentBullet.trim()) {
      this.triggerNotification('Input Required', 'Please type an achievement in the first bullet point first.');
      return;
    }

    this.triggerNotification('AI Optimizer', 'Enhancing metrics-driven bullet achievement...');

    // We'll call the backend and patch the first achievement bullet in the selected experience
    this.resumeService.isLoading.set(true);
    this.resumeService.loadingMessage.set('AI is improving your bullet point achievement metrics...');
    this.resumeService.improveBulletFromServer(currentBullet).subscribe({
      next: (res) => {
        achArray.at(0).setValue(res.enhancedBullet);
        this.triggerNotification('Success', 'Optimized achievement bullet using Llama AI!');
      },
      error: (err) => {
        this.triggerNotification('Connection Error', 'Backend service failed to respond.');
        console.error(err);
      }
    });
  }


  // Trigger AI Notice popup
  triggerAiNotice(featureName: string): void {
    this.triggerNotification('Coming Soon', `${featureName} is under development and will be connected in Phase 5 using NVIDIA NeMo models.`);
  }

  // Helper notification toast
  triggerNotification(title: string, message: string): void {
    this.aiNoticeTitle.set(title);
    this.aiNoticeMessage.set(message);
    this.showAiNotice.set(true);

    // Auto close after 4 seconds
    setTimeout(() => {
      this.showAiNotice.set(false);
    }, 4000);
  }

  closeNotice(): void {
    this.showAiNotice.set(false);
  }

  // Trigger Job Description Matching
  triggerJobMatch(): void {
    const jd = this.matchJDText().trim();
    if (!jd) {
      this.triggerNotification('Input Required', 'Please enter a Job Description to match against.');
      return;
    }
    this.resumeService.isLoading.set(true);
    this.resumeService.loadingMessage.set('AI matching in progress. Analyzing resume against job description...');
    this.resumeService.matchJobDescription(jd).subscribe({
      next: (res) => {
        this.jobMatchData.set(res);
        this.triggerNotification('Match Complete', `Resume scored ${res.matchScore}% against the job details.`);
      },
      error: (err) => {
        this.triggerNotification('Error', 'Failed to perform Job Match analysis. Check backend server.');
        console.error(err);
      }
    });
  }

  // Trigger ATS Audit Review
  triggerAtsAudit(): void {
    this.resumeService.isLoading.set(true);
    this.resumeService.loadingMessage.set('ATS review in progress. Performing keyword and formatting audit...');
    this.resumeService.getAtsReview().subscribe({
      next: (res) => {
        this.atsReviewData.set(res);
        this.triggerNotification('Audit Complete', `ATS Score: ${res.atsScore}%. Checked keyword matches & issues.`);
      },
      error: (err) => {
        this.triggerNotification('Error', 'Failed to perform ATS compatibility audit. Check backend.');
        console.error(err);
      }
    });
  }

  // Update JD text signal
  updateJDText(val: string): void {
    this.matchJDText.set(val);
  }

  // Preview tab toggle
  setPreviewTab(tab: 'resume' | 'roadmap' | 'match' | 'ats'): void {
    this.activePreviewTab.set(tab);
  }

  // Helper cast for template
  asFormGroup(item: any): FormGroup {
    return item as FormGroup;
  }
}

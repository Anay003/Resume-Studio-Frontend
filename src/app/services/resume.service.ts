import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { ResumeData, LearningRoadmap, JobMatchResult, AtsReviewResult } from '../models/resume.model';

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'https://resume-studio-backend-nfqb.onrender.com/api';
  public readonly resumeForm: FormGroup;

  // Loading indicators for API operations
  public readonly isLoading = signal<boolean>(false);
  public readonly loadingMessage = signal<string>('');

  constructor() {
    this.resumeForm = this.fb.group({
      personalInfo: this.fb.group({
        fullName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        location: [''],
        linkedIn: [''],
        gitHub: [''],
        portfolio: [''],
        currentRole: ['']
      }),
      professionalSummary: [''],
      skills: this.fb.group({
        programmingLanguages: [''],
        frameworks: [''],
        databases: [''],
        cloud: [''],
        devOps: [''],
        tools: [''],
        softSkills: ['']
      }),
      experience: this.fb.array([]),
      projects: this.fb.array([]),
      education: this.fb.array([]),
      certifications: this.fb.array([]),
      achievements: [''], // Comma-separated string for simplicity
      languages: [''] // Comma-separated string for simplicity
    });
  }

  // HTTP API Methods

  // Save the current form state to the backend cache
  saveToServer(): Observable<any> {
    this.isLoading.set(true);
    this.loadingMessage.set('Saving resume data to cloud...');
    const data = this.getResumeData();
    return this.http.post(`${this.apiUrl}/resume`, data).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  // Load the saved resume state from the backend cache
  loadFromServer(): Observable<ResumeData> {
    this.isLoading.set(true);
    this.loadingMessage.set('Loading saved resume...');
    return this.http.get<ResumeData>(`${this.apiUrl}/resume`).pipe(
      tap(data => {
        if (data) {
          this.setResumeData(data);
        }
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  // Upload a PDF to the backend parser and get back extracted text + AI-structured parsedData
  parsePdf(file: File): Observable<{ fileName: string; extractedText: string; parsedData?: Partial<ResumeData>; message: string }> {
    this.isLoading.set(true);
    this.loadingMessage.set('AI parsing is running. Extracting structured information from PDF...');
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ fileName: string; extractedText: string; parsedData?: Partial<ResumeData>; message: string }>(
      `${this.apiUrl}/resume/parse`,
      formData
    ).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  // Call the PDF resume builder endpoint and download the document
  downloadPdfFromServer(): void {
    this.isLoading.set(true);
    this.loadingMessage.set('Generating professional PDF document...');
    const data = this.getResumeData();
    this.http.post(`${this.apiUrl}/pdf/resume`, data, { responseType: 'blob' }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = data.personalInfo.fullName ? data.personalInfo.fullName.replace(/\s+/g, '_') : 'Resume';
        a.download = `${name}_Resume.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download PDF resume from backend.', err);
      }
    });
  }

  // Call the PDF roadmap builder endpoint and download the document
  downloadRoadmapPdfFromServer(roadmap: LearningRoadmap): void {
    this.isLoading.set(true);
    this.loadingMessage.set('Generating learning roadmap PDF...');
    this.http.post(`${this.apiUrl}/pdf/roadmap`, roadmap, { responseType: 'blob' }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = roadmap.targetRole ? roadmap.targetRole.replace(/\s+/g, '_') : 'Roadmap';
        a.download = `${name}_Roadmap.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download PDF roadmap from backend.', err);
      }
    });
  }


  // Call the AI Summary Optimizer endpoint
  enhanceSummaryFromServer(currentSummary: string): Observable<{ enhancedSummary: string }> {
    this.isLoading.set(true);
    this.loadingMessage.set('AI is optimizing your professional summary...');
    // Note: backend enhance endpoint expects content-type application/json string
    return this.http.post<{ enhancedSummary: string }>(`${this.apiUrl}/resume/enhance`, JSON.stringify(currentSummary), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  // Call the AI Bullet Optimizer endpoint
  improveBulletFromServer(currentBullet: string): Observable<{ enhancedBullet: string }> {
    this.isLoading.set(true);
    this.loadingMessage.set('AI is improving your bullet point achievement metrics...');
    return this.http.post<{ enhancedBullet: string }>(`${this.apiUrl}/resume/improve-bullet`, JSON.stringify(currentBullet), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  // Call Job Matching endpoint
  matchJobDescription(jobDescription: string): Observable<JobMatchResult> {
    this.isLoading.set(true);
    this.loadingMessage.set('AI matching in progress. Analyzing resume against job description...');
    
    const payload = {
      resumeData: this.getResumeData(),
      jobDescriptionText: jobDescription
    };

    return this.http.post<JobMatchResult>(`${this.apiUrl}/resume/match`, payload).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  // Call ATS Review endpoint
  getAtsReview(): Observable<AtsReviewResult> {
    this.isLoading.set(true);
    this.loadingMessage.set('ATS review in progress. Performing keyword and formatting audit...');
    
    const data = this.getResumeData();
    return this.http.post<AtsReviewResult>(`${this.apiUrl}/resume/ats-review`, data).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  // Call AI Learning Roadmap endpoint
  generateRoadmap(targetRole: string, jobDescriptionText: string = ''): Observable<LearningRoadmap> {
    this.isLoading.set(true);
    this.loadingMessage.set(`AI is crafting a personalized learning roadmap for "${targetRole}"...`);

    const payload = {
      resumeData: this.getResumeData(),
      targetRole,
      jobDescriptionText
    };

    return this.http.post<LearningRoadmap>(`${this.apiUrl}/resume/roadmap`, payload).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  // Getters for FormArrays
  get experience(): FormArray {
    return this.resumeForm.get('experience') as FormArray;
  }

  get projects(): FormArray {
    return this.resumeForm.get('projects') as FormArray;
  }

  get education(): FormArray {
    return this.resumeForm.get('education') as FormArray;
  }

  get certifications(): FormArray {
    return this.resumeForm.get('certifications') as FormArray;
  }

  // Experience array operations
  addExperience(): void {
    const expGroup = this.fb.group({
      company: ['', [Validators.required]],
      role: ['', [Validators.required]],
      location: [''],
      startDate: [''],
      endDate: [''],
      currentlyWorking: [false],
      responsibilities: this.fb.array([this.fb.control('')]),
      achievements: this.fb.array([this.fb.control('')])
    });
    this.experience.push(expGroup);
  }

  removeExperience(index: number): void {
    this.experience.removeAt(index);
  }

  getResponsibilities(expIndex: number): FormArray {
    return this.experience.at(expIndex).get('responsibilities') as FormArray;
  }

  addResponsibility(expIndex: number): void {
    this.getResponsibilities(expIndex).push(this.fb.control(''));
  }

  removeResponsibility(expIndex: number, respIndex: number): void {
    this.getResponsibilities(expIndex).removeAt(respIndex);
  }

  getExpAchievements(expIndex: number): FormArray {
    return this.experience.at(expIndex).get('achievements') as FormArray;
  }

  addExpAchievement(expIndex: number): void {
    this.getExpAchievements(expIndex).push(this.fb.control(''));
  }

  removeExpAchievement(expIndex: number, achIndex: number): void {
    this.getExpAchievements(expIndex).removeAt(achIndex);
  }

  // Projects array operations
  addProject(): void {
    const projGroup = this.fb.group({
      title: ['', [Validators.required]],
      technologyStack: [''],
      description: [''],
      gitHubUrl: [''],
      liveUrl: [''],
      highlights: this.fb.array([this.fb.control('')])
    });
    this.projects.push(projGroup);
  }

  removeProject(index: number): void {
    this.projects.removeAt(index);
  }

  getHighlights(projIndex: number): FormArray {
    return this.projects.at(projIndex).get('highlights') as FormArray;
  }

  addHighlight(projIndex: number): void {
    this.getHighlights(projIndex).push(this.fb.control(''));
  }

  removeHighlight(projIndex: number, hlIndex: number): void {
    this.getHighlights(projIndex).removeAt(hlIndex);
  }

  // Education array operations
  addEducation(): void {
    const eduGroup = this.fb.group({
      degree: ['', [Validators.required]],
      institution: ['', [Validators.required]],
      university: [''],
      cgpa: [''],
      startDate: [''],
      endDate: ['']
    });
    this.education.push(eduGroup);
  }

  removeEducation(index: number): void {
    this.education.removeAt(index);
  }

  // Certifications array operations
  addCertification(): void {
    const certGroup = this.fb.group({
      name: ['', [Validators.required]],
      issuer: ['', [Validators.required]],
      date: ['']
    });
    this.certifications.push(certGroup);
  }

  removeCertification(index: number): void {
    this.certifications.removeAt(index);
  }

  // Helper to split comma-separated strings to arrays
  private splitString(val: string | null | undefined): string[] {
    if (!val) return [];
    return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  // Helper to join array elements with comma
  private joinArray(val: string[] | null | undefined): string {
    if (!val) return '';
    return val.join(', ');
  }

  // Get raw JSON value formatted as ResumeData
  getResumeData(): ResumeData {
    const formVal = this.resumeForm.value;
    return {
      personalInfo: formVal.personalInfo,
      professionalSummary: formVal.professionalSummary,
      skills: {
        programmingLanguages: this.splitString(formVal.skills.programmingLanguages),
        frameworks: this.splitString(formVal.skills.frameworks),
        databases: this.splitString(formVal.skills.databases),
        cloud: this.splitString(formVal.skills.cloud),
        devOps: this.splitString(formVal.skills.devOps),
        tools: this.splitString(formVal.skills.tools),
        softSkills: this.splitString(formVal.skills.softSkills)
      },
      experience: (formVal.experience || []).map((exp: any) => ({
        ...exp,
        responsibilities: (exp.responsibilities || []).filter((r: string) => r && r.trim().length > 0),
        achievements: (exp.achievements || []).filter((a: string) => a && a.trim().length > 0)
      })),
      projects: (formVal.projects || []).map((proj: any) => ({
        ...proj,
        highlights: (proj.highlights || []).filter((h: string) => h && h.trim().length > 0)
      })),
      education: formVal.education || [],
      certifications: formVal.certifications || [],
      achievements: this.splitString(formVal.achievements),
      languages: this.splitString(formVal.languages)
    };
  }

  // Set form value from ResumeData JSON structure
  setResumeData(data: Partial<ResumeData>): void {
    this.resumeForm.reset();

    // Clear all arrays first
    while (this.experience.length) this.experience.removeAt(0);
    while (this.projects.length) this.projects.removeAt(0);
    while (this.education.length) this.education.removeAt(0);
    while (this.certifications.length) this.certifications.removeAt(0);

    if (!data) return;

    // Patch simple properties
    if (data.personalInfo) {
      this.resumeForm.get('personalInfo')?.patchValue(data.personalInfo);
    }
    if (data.professionalSummary !== undefined) {
      this.resumeForm.patchValue({ professionalSummary: data.professionalSummary });
    }

    // Patch skills
    if (data.skills) {
      this.resumeForm.get('skills')?.patchValue({
        programmingLanguages: this.joinArray(data.skills.programmingLanguages),
        frameworks: this.joinArray(data.skills.frameworks),
        databases: this.joinArray(data.skills.databases),
        cloud: this.joinArray(data.skills.cloud),
        devOps: this.joinArray(data.skills.devOps),
        tools: this.joinArray(data.skills.tools),
        softSkills: this.joinArray(data.skills.softSkills)
      });
    }

    // Patch Experience array
    if (data.experience && Array.isArray(data.experience)) {
      data.experience.forEach(exp => {
        const expGroup = this.fb.group({
          company: [exp.company || '', [Validators.required]],
          role: [exp.role || '', [Validators.required]],
          location: [exp.location || ''],
          startDate: [exp.startDate || ''],
          endDate: [exp.endDate || ''],
          currentlyWorking: [exp.currentlyWorking || false],
          responsibilities: this.fb.array(
            (exp.responsibilities && exp.responsibilities.length > 0)
              ? exp.responsibilities.map(r => this.fb.control(r))
              : [this.fb.control('')]
          ),
          achievements: this.fb.array(
            (exp.achievements && exp.achievements.length > 0)
              ? exp.achievements.map(a => this.fb.control(a))
              : [this.fb.control('')]
          )
        });
        this.experience.push(expGroup);
      });
    }

    // Patch Projects array
    if (data.projects && Array.isArray(data.projects)) {
      data.projects.forEach(proj => {
        const projGroup = this.fb.group({
          title: [proj.title || '', [Validators.required]],
          technologyStack: [proj.technologyStack || ''],
          description: [proj.description || ''],
          gitHubUrl: [proj.gitHubUrl || ''],
          liveUrl: [proj.liveUrl || ''],
          highlights: this.fb.array(
            (proj.highlights && proj.highlights.length > 0)
              ? proj.highlights.map(h => this.fb.control(h))
              : [this.fb.control('')]
          )
        });
        this.projects.push(projGroup);
      });
    }

    // Patch Education array
    if (data.education && Array.isArray(data.education)) {
      data.education.forEach(edu => {
        const eduGroup = this.fb.group({
          degree: [edu.degree || '', [Validators.required]],
          institution: [edu.institution || '', [Validators.required]],
          university: [edu.university || ''],
          cgpa: [edu.cgpa || ''],
          startDate: [edu.startDate || ''],
          endDate: [edu.endDate || '']
        });
        this.education.push(eduGroup);
      });
    }

    // Patch Certifications array
    if (data.certifications && Array.isArray(data.certifications)) {
      data.certifications.forEach(cert => {
        const certGroup = this.fb.group({
          name: [cert.name || '', [Validators.required]],
          issuer: [cert.issuer || '', [Validators.required]],
          date: [cert.date || '']
        });
        this.certifications.push(certGroup);
      });
    }

    // Patch remaining fields
    this.resumeForm.patchValue({
      achievements: this.joinArray(data.achievements),
      languages: this.joinArray(data.languages)
    });
  }

  // Load professional sample data for demonstration
  loadSampleData(): void {
    const sample: ResumeData = {
      personalInfo: {
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1 (555) 019-2834',
        location: 'San Francisco, CA',
        linkedIn: 'linkedin.com/in/janedoe',
        gitHub: 'github.com/janedoe',
        portfolio: 'janedoe.dev',
        currentRole: 'Senior Frontend Engineer'
      },
      professionalSummary: 'Experienced frontend engineer with 5+ years of experience designing and implementing scalable web applications. Strong track record of improving performance and accessibility using modern tech stacks including Angular and TypeScript.',
      skills: {
        programmingLanguages: ['TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'SQL'],
        frameworks: ['Angular', 'RxJS', 'NgRx', 'Bootstrap', 'Sass'],
        databases: ['PostgreSQL', 'MongoDB'],
        cloud: ['AWS', 'Firebase'],
        devOps: ['Docker', 'GitHub Actions', 'CI/CD'],
        tools: ['Git', 'Webpack', 'VS Code', 'Figma'],
        softSkills: ['Mentoring', 'Agile/Scrum', 'Technical Writing', 'Communication']
      },
      experience: [
        {
          company: 'Tech Solutions Inc.',
          role: 'Senior Frontend Engineer',
          location: 'San Francisco, CA',
          startDate: '2023-01',
          endDate: '',
          currentlyWorking: true,
          responsibilities: [
            'Architected and built the core user interface of a high-traffic SaaS dashboard, improving client side load times by 40%.',
            'Led a team of 4 frontend engineers, defining development workflows and code standards.',
            'Collaborated with design and product teams to establish a modern UI design system.'
          ],
          achievements: [
            'Successfully migrated a legacy code base to Angular 18+, resulting in 25% faster feature delivery rates.',
            'Designed a client-side state caching layer that reduced API query costs by $5,000/month.'
          ]
        },
        {
          company: 'WebDev Labs',
          role: 'Software Engineer',
          location: 'San Jose, CA',
          startDate: '2021-03',
          endDate: '2022-12',
          currentlyWorking: false,
          responsibilities: [
            'Developed responsive web interfaces using Angular, RxJS, and clean styles.',
            'Wrote unit and integration tests, raising test coverage from 60% to 85%.'
          ],
          achievements: [
            'Optimized image loading pipelines, reducing page bounce rate by 12%.',
            'Won the company internal hackathon by designing an automated documentation generator.'
          ]
        }
      ],
      projects: [
        {
          title: 'AI Portfolio Builder',
          technologyStack: 'Angular, RxJS, OpenAI API, SCSS',
          description: 'A client-side portfolio generator that builds standard resume layouts and maps developer achievements automatically.',
          gitHubUrl: 'github.com/janedoe/portfolio-builder',
          liveUrl: 'portfolio-builder.janedoe.dev',
          highlights: [
            'Implemented a robust Angular reactive form structure to support custom user profiles.',
            'Designed full A4 print layout stylesheet templates for high fidelity PDF printing.'
          ]
        }
      ],
      education: [
        {
          degree: 'Bachelor of Science in Computer Science',
          institution: 'State University',
          university: 'State University',
          cgpa: '3.8/4.0',
          startDate: '2017-09',
          endDate: '2021-05'
        }
      ],
      certifications: [
        {
          name: 'Angular Certified Developer',
          issuer: 'Angular Association',
          date: '2023-06'
        },
        {
          name: 'AWS Certified Cloud Practitioner',
          issuer: 'Amazon Web Services',
          date: '2022-11'
        }
      ],
      achievements: [
        'Contributed 10+ pull requests to Angular open-source repositories',
        'Keynote speaker at the local Javascript meetup'
      ],
      languages: ['English (Native)', 'Spanish (Conversational)']
    };

    this.setResumeData(sample);
  }

  // Clear current state to a blank template
  clearResumeData(): void {
    const empty: ResumeData = {
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        linkedIn: '',
        gitHub: '',
        portfolio: '',
        currentRole: ''
      },
      professionalSummary: '',
      skills: {
        programmingLanguages: [],
        frameworks: [],
        databases: [],
        cloud: [],
        devOps: [],
        tools: [],
        softSkills: []
      },
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      achievements: [],
      languages: []
    };
    this.setResumeData(empty);
  }


}

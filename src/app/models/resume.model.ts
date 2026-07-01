export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  gitHub: string;
  portfolio: string;
  currentRole: string;
}

export interface Experience {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  responsibilities: string[];
  achievements: string[];
}

export interface Project {
  title: string;
  technologyStack: string; // comma-separated or list, we can represent it as string for form simplicity or string[]
  description: string;
  gitHubUrl: string;
  liveUrl: string;
  highlights: string[];
}

export interface Education {
  degree: string;
  institution: string;
  university: string;
  cgpa: string;
  startDate: string;
  endDate: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface Skills {
  programmingLanguages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  devOps: string[];
  tools: string[];
  softSkills: string[];
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  professionalSummary: string;
  skills: Skills;
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];
  achievements: string[];
  languages: string[];
}

export interface RoadmapStep {
  stepTitle: string;
  description: string;
  durationEstimate: string;
  resources: string[];
}

export interface LearningRoadmap {
  targetRole: string;
  description: string;
  steps: RoadmapStep[];
}

export interface JobMatchResult {
  matchScore: number;
  missingSkills: string[];
  suggestions: string[];
}

export interface AtsReviewResult {
  atsScore: number;
  formattingIssues: string[];
  keywordMatches: string[];
  missingKeywords: string[];
  improvementSuggestions: string[];
}


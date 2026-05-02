export interface SectionScore {
  name: string;
  score: number;
  maxScore: number;
}

export interface PDFFile {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEWED';
  totalScore: number;
  sectionScores: SectionScore[];
}

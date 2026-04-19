export interface PDFFile {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  status: 'PENDING' | 'REVIEWED';
  scores: {
    content: number;
    synthesis: number;
    references: number;
    format: number;
  };
}

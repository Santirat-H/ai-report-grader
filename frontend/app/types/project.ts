export interface ProjectSection {
  id: string;
  name: string;
  maxScore: number;
  rubricDescription: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sections: ProjectSection[];
}

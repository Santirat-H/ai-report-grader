export class CreateProjectSectionDto {
  name: string;
  maxScore: number;
  rubric: string;
}

export class CreateProjectDto {
  name: string;
  assignmentDetails?: string;
  sections: CreateProjectSectionDto[];
}

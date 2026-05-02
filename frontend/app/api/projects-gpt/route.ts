import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'projects_gpt.json');
const DEFAULT_MAX_SCORE = 4;

type ProjectSection = {
  id: string;
  name: string;
  maxScore: number;
  rubric: string;
};

type Project = {
  id: string;
  name: string;
  assignmentDetails: string;
  createdAt: string;
  updatedAt: string;
  sections: ProjectSection[];
};

function createSectionId(index: number) {
  return `${Date.now()}-${index + 1}`;
}

function buildDefaultSection(index: number): ProjectSection {
  const order = index + 1;

  return {
    id: createSectionId(index),
    name: `column ${order}`,
    maxScore: DEFAULT_MAX_SCORE,
    rubric: '',
  };
}

function ensureDataFile() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([], null, 2));
  }
}

function readProjects(): Project[] {
  ensureDataFile();

  const rawContent = fs.readFileSync(dataFilePath, 'utf8').trim();
  if (!rawContent) {
    return [];
  }

  return JSON.parse(rawContent) as Project[];
}

function writeProjects(projects: Project[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(projects, null, 2));
}

function normalizeSection(section: unknown, index: number): ProjectSection {
  const fallback = buildDefaultSection(index);
  const sectionInput = typeof section === 'object' && section !== null ? section as Partial<ProjectSection> : {};
  const parsedMaxScore = Number(sectionInput.maxScore);

  return {
    id: typeof sectionInput.id === 'string' && sectionInput.id.trim() ? sectionInput.id.trim() : fallback.id,
    name: typeof sectionInput.name === 'string' && sectionInput.name.trim() ? sectionInput.name.trim() : fallback.name,
    maxScore: Number.isFinite(parsedMaxScore) && parsedMaxScore > 0 ? parsedMaxScore : fallback.maxScore,
    rubric: typeof sectionInput.rubric === 'string' ? sectionInput.rubric.trim() : '',
  };
}

function normalizeProject(input: unknown, existingProject?: Project): Project {
  const timestamp = new Date().toISOString();
  const projectInput = typeof input === 'object' && input !== null ? input as Partial<Project> : {};
  const sectionSource = Array.isArray(projectInput.sections) && projectInput.sections.length > 0
    ? projectInput.sections
    : existingProject?.sections ?? [buildDefaultSection(0)];

  return {
    id: typeof projectInput.id === 'string' && projectInput.id.trim()
      ? projectInput.id.trim()
      : existingProject?.id ?? Date.now().toString(),
    name: typeof projectInput.name === 'string' && projectInput.name.trim()
      ? projectInput.name.trim()
      : existingProject?.name ?? 'Untitled GPT Project',
    assignmentDetails: typeof projectInput.assignmentDetails === 'string'
      ? projectInput.assignmentDetails.trim()
      : existingProject?.assignmentDetails ?? '',
    createdAt: existingProject?.createdAt ?? projectInput.createdAt ?? timestamp,
    updatedAt: timestamp,
    sections: sectionSource.map((section, index) => normalizeSection(section, index)),
  };
}

export async function GET() {
  try {
    return NextResponse.json(readProjects());
  } catch {
    return NextResponse.json({ error: 'Failed to read GPT projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const incomingProject = await request.json();
    const projects = readProjects();
    const existingIndex = projects.findIndex((project) => project.id === incomingProject?.id);
    const existingProject = existingIndex >= 0 ? projects[existingIndex] : undefined;
    const normalizedProject = normalizeProject(incomingProject, existingProject);

    if (existingIndex >= 0) {
      projects[existingIndex] = normalizedProject;
    } else {
      projects.push(normalizedProject);
    }

    writeProjects(projects);

    return NextResponse.json({ success: true, project: normalizedProject });
  } catch {
    return NextResponse.json({ error: 'Failed to save GPT project' }, { status: 500 });
  }
}

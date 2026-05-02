import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'projects_gemini.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify([]));
    }
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newProject = await request.json();
    
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify([]));
    }
    
    const data = fs.readFileSync(dataFilePath, 'utf8');
    const projects = JSON.parse(data);
    
    // Check if updating or adding
    if (newProject.id) {
      const existingIndex = projects.findIndex((p: any) => p.id === newProject.id);
      if (existingIndex >= 0) {
        projects[existingIndex] = newProject;
      } else {
        projects.push(newProject);
      }
    } else {
      newProject.id = Date.now().toString();
      projects.push(newProject);
    }
    
    fs.writeFileSync(dataFilePath, JSON.stringify(projects, null, 2));
    return NextResponse.json({ success: true, project: newProject });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}

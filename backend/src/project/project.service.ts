import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        assignmentDetails: dto.assignmentDetails ?? '',
        sections: {
          create: (dto.sections ?? []).map((s, i) => ({
            name: s.name,
            maxScore: s.maxScore,
            rubric: s.rubric,
            order: i,
          })),
        },
      },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      include: {
        sections: { orderBy: { order: 'asc' } },
        _count: { select: { files: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { order: 'asc' } },
        _count: { select: { files: true } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async update(id: string, dto: CreateProjectDto) {
    await this.findOne(id);
    await this.prisma.projectSection.deleteMany({ where: { projectId: id } });
    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        assignmentDetails: dto.assignmentDetails ?? '',
        sections: {
          create: (dto.sections ?? []).map((s, i) => ({
            name: s.name,
            maxScore: s.maxScore,
            rubric: s.rubric,
            order: i,
          })),
        },
      },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }
}

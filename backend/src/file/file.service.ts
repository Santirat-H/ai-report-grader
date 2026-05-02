import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GradingService } from '../grading/grading.service';

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly grading: GradingService,
  ) {}

  async uploadPdf(file: Express.Multer.File, projectId?: string) {
    const { name, size, url } = await this.storageService.uploadFile(file);
    return this.prisma.file.create({
      data: {
        name,
        size,
        url,
        ...(projectId ? { projectId } : {}),
      },
    });
  }

  async getAllFiles(projectId?: string) {
    const files = await this.prisma.file.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        sectionScores: true,
        project: { include: { sections: { orderBy: { order: 'asc' } } } },
      },
    });

    return files.map((file) => {
      const maxScoreByName: Record<string, number> = {};
      const orderByName: Record<string, number> = {};
      for (const ps of file.project?.sections ?? []) {
        maxScoreByName[ps.name] = ps.maxScore;
        orderByName[ps.name] = ps.order;
      }

      const sectionScores = file.sectionScores
        .map((s) => ({
          name: s.sectionName,
          score: s.score,
          maxScore: maxScoreByName[s.sectionName] ?? 4,
        }))
        .sort((a, b) => (orderByName[a.name] ?? 0) - (orderByName[b.name] ?? 0));

      return {
        id: file.id,
        name: file.name,
        url: file.url,
        size: file.size,
        createdAt: file.createdAt,
        status: file.status,
        totalScore: file.totalScore ?? 0,
        overallFeedback: file.overallFeedback,
        projectId: file.projectId,
        sectionScores,
      };
    });
  }

  async deleteFile(id: string) {
    // 1. Get the file record to find its url
    const file = await this.prisma.file.findUnique({
      where: { id },
    });
    
    if (!file) {
      return { success: false, message: 'File not found' };
    }

    // 2. Extract the actual storage filename from the URL 
    const storageFileName = file.url.split('/').pop();

    if (storageFileName) {
      // 3. Delete from Supabase Storage
      await this.storageService.deleteFile(storageFileName);
    }

    // 4. Delete related SectionScores first to prevent foreign key errors
    await this.prisma.sectionScore.deleteMany({
      where: { reportId: id },
    });

    // 5. Delete metadata from Prisma database
    await this.prisma.file.delete({
      where: { id },
    });

    return { success: true };
  }

  async getFileById(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: {
        sectionScores: true,
        project: { include: { sections: { orderBy: { order: 'asc' } } } },
        humanReview: { include: { sections: true } },
      },
    });
    if (!file) throw new NotFoundException(`File ${id} not found`);

    const maxScoreByName: Record<string, number> = {};
    const orderByName: Record<string, number> = {};
    for (const ps of file.project?.sections ?? []) {
      maxScoreByName[ps.name] = ps.maxScore;
      orderByName[ps.name] = ps.order;
    }

    const aiSections = file.sectionScores
      .map((s) => ({
        name: s.sectionName,
        score: s.score,
        feedback: s.comment,
        maxScore: maxScoreByName[s.sectionName] ?? 4,
      }))
      .sort((a, b) => (orderByName[a.name] ?? 0) - (orderByName[b.name] ?? 0));

    const humanSectionsByName: Record<string, { score: number; feedback: string }> = {};
    for (const s of file.humanReview?.sections ?? []) {
      humanSectionsByName[s.sectionName] = { score: s.score, feedback: s.feedback };
    }

    return {
      id: file.id,
      name: file.name,
      url: file.url,
      status: file.status,
      totalScore: file.totalScore ?? 0,
      overallFeedback: file.overallFeedback ?? '',
      aiSections,
      humanReview: file.humanReview
        ? {
            id: file.humanReview.id,
            totalScore: file.humanReview.totalScore,
            overallFeedback: file.humanReview.overallFeedback ?? '',
            sectionsByName: humanSectionsByName,
          }
        : null,
    };
  }

  async saveReview(
    fileId: string,
    dto: {
      sections: { sectionName: string; score: number; feedback: string }[];
      overallFeedback?: string;
      confirm?: boolean;
    },
  ) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException(`File ${fileId} not found`);

    const totalScore = Math.round(
      dto.sections.reduce((sum, s) => sum + s.score, 0) * 100,
    ) / 100;

    await this.prisma.$transaction(async (tx) => {
      const review = await tx.humanReview.upsert({
        where: { fileId },
        create: { fileId, totalScore, overallFeedback: dto.overallFeedback ?? '' },
        update: { totalScore, overallFeedback: dto.overallFeedback ?? '' },
      });

      await tx.humanSectionScore.deleteMany({ where: { reviewId: review.id } });

      if (dto.sections.length > 0) {
        await tx.humanSectionScore.createMany({
          data: dto.sections.map((s) => ({
            reviewId: review.id,
            sectionName: s.sectionName,
            score: s.score,
            feedback: s.feedback,
          })),
        });
      }

      if (dto.confirm) {
        await tx.file.update({ where: { id: fileId }, data: { status: 'REVIEWED' } });
      }
    });

    return { success: true, fileId, totalScore };
  }

  async analyzeFile(fileId: string, projectId: string) {
    const [file, project] = await Promise.all([
      this.prisma.file.findUnique({ where: { id: fileId } }),
      this.prisma.project.findUnique({
        where: { id: projectId },
        include: { sections: { orderBy: { order: 'asc' } } },
      }),
    ]);

    if (!file) throw new NotFoundException(`File ${fileId} not found`);
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (!project.sections.length) throw new Error('Project has no grading sections');

    await this.prisma.file.update({ where: { id: fileId }, data: { status: 'PROCESSING' } });

    try {
      const text = await this.grading.extractTextFromPdf(file.url);
      if (text.trim().length < 50) throw new Error('PDF text too short or image-only — cannot grade');

      const prompt = this.grading.buildPrompt(project, text);
      const { raw, provider, model } = await this.grading.callLlm(prompt);
      const result = this.grading.normalizeResult(raw, project, provider, model);

      // Upsert each section score
      await Promise.all(
        result.sections.map((s) =>
          this.prisma.sectionScore.upsert({
            where: { reportId_sectionName: { reportId: fileId, sectionName: s.name } },
            create: { reportId: fileId, sectionName: s.name, score: s.score, comment: s.feedback },
            update: { score: s.score, comment: s.feedback },
          }),
        ),
      );

      await this.prisma.file.update({
        where: { id: fileId },
        data: { status: 'COMPLETED', totalScore: result.totalScore, overallFeedback: result.overallFeedback },
      });

      return { success: true, fileId, ...result };
    } catch (err) {
      await this.prisma.file.update({ where: { id: fileId }, data: { status: 'FAILED' } });
      throw err;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async uploadPdf(file: Express.Multer.File) {
    // 1. Upload to Supabase
    const { name, size, url } = await this.storageService.uploadFile(file);

    // 2. Save metadata to database (name = original filename, size in bytes)
    const savedFile = await this.prisma.file.create({
      data: {
        name,
        size,
        url,
      },
    });

    return savedFile;
  }

  async getAllFiles() {
    // Use the Supabase HTTP client for reads — much faster than PrismaPg's
    // raw TCP connection, and returns the same data (original filenames + sizes).
    return this.storageService.getFilesFromDB();
  }

  async deleteFile(id: string) {
    // 1. Delete from Supabase Storage
    await this.storageService.deleteFile(id);

    // 2. Delete metadata from Prisma database
    // We match by URL containing the storage filename
    await this.prisma.file.deleteMany({
      where: {
        url: {
          contains: id,
        },
      },
    });

    return { success: true };
  }
}

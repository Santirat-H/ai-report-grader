import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('pdf')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('projectId') projectId?: string,
  ) {
    return this.fileService.uploadPdf(file, projectId);
  }

  @Get('files')
  async getAllFiles(@Query('projectId') projectId?: string) {
    return this.fileService.getAllFiles(projectId);
  }

  @Get('files/:id')
  async getFileById(@Param('id') id: string) {
    return this.fileService.getFileById(id);
  }

  @Delete('files/:id')
  async deleteFile(@Param('id') id: string) {
    return this.fileService.deleteFile(id);
  }

  @Post('review/:id')
  async saveReview(
    @Param('id') id: string,
    @Body()
    body: {
      sections: { sectionName: string; score: number; feedback: string }[];
      overallFeedback?: string;
      confirm?: boolean;
    },
  ) {
    return this.fileService.saveReview(id, body);
  }

  @Post('analyze/:id')
  async analyzeFile(
    @Param('id') id: string,
    @Body('projectId') projectId: string,
  ) {
    if (!projectId) throw new BadRequestException('projectId is required');
    return this.fileService.analyzeFile(id, projectId);
  }
}

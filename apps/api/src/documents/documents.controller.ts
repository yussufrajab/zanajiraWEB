import { Controller, Get, Param, Post, Res, StreamableFile, UploadedFile, UseInterceptors, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { Public } from '../auth/public.decorator';
import { Response } from 'express';

@Controller('documents')
export class DocumentsController {
  constructor(private docs: DocumentsService, private storage: StorageService) {}

  @Post('upload/:ownerType/:ownerId')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Param('ownerType') ownerType: string, @Param('ownerId') ownerId: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.docs.upload(file, ownerType, ownerId);
  }

  @Public()
  @Get('download/:id')
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const doc = await this.docs.getById(id);
    if (!doc) throw new NotFoundException('Document not found');
    await this.docs.registerDownload(id);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
    res.setHeader('Content-Type', doc.mimeType);
    return new StreamableFile(await this.storage.getStream(doc.storageKey));
  }

  @Public()
  @Get(':id')
  async meta(@Param('id') id: string) {
    const doc = await this.docs.getById(id);
    if (!doc) throw new NotFoundException('Document not found');
    return {
      id: doc.id,
      filename: doc.filename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      downloadCount: doc.downloadCount,
      url: this.storage.publicUrl(doc.storageKey),
    };
  }
}
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { MalwareScannerService } from './malware-scanner.service';

const ALLOWED_MIME = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class DocumentsService {
  constructor(
    private storage: StorageService,
    private scanner: MalwareScannerService,
    private prisma: PrismaService,
  ) {}

  async upload(file: { buffer: Buffer; mimetype: string; originalname: string; size: number }, ownerType: string, ownerId: string) {
    if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException('File type not allowed');
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds 25MB limit');

    const { clean } = await this.scanner.scanStream(file.buffer);
    if (!clean) throw new BadRequestException('File failed malware scan');

    const key = this.storage.buildKey(ownerType, ownerId, file.originalname);
    await this.storage.put(key, file.buffer, file.mimetype);

    return this.prisma.document.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: key,
        ownerType,
        ownerId,
        scannedClean: true,
      },
    });
  }

  async getById(id: string) {
    return this.prisma.document.findUnique({ where: { id } });
  }

  async registerDownload(documentId: string) {
    await this.prisma.document.update({ where: { id: documentId }, data: { downloadCount: { increment: 1 } } });
    await this.prisma.documentDownload.create({ data: { documentId } });
  }

  async listForOwner(ownerType: string, ownerId: string) {
    return this.prisma.document.findMany({ where: { ownerType, ownerId } });
  }

  async attachDocuments(ownerType: string, ownerId: string, documentIds: string[]) {
    return this.prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: { ownerType, ownerId },
    });
  }
}
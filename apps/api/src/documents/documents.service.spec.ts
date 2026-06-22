import { Test } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { MalwareScannerService } from './malware-scanner.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DocumentsService', () => {
  let service: DocumentsService;
  const storage = { buildKey: jest.fn().mockReturnValue('k'), put: jest.fn().mockResolvedValue(undefined), publicUrl: jest.fn().mockReturnValue('u'), getStream: jest.fn() };
  const scanner = { scanStream: jest.fn().mockResolvedValue({ clean: true }) };
  const prisma = {
    document: { create: jest.fn().mockResolvedValue({ id: 'd1' }), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    documentDownload: { create: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: StorageService, useValue: storage },
        { provide: MalwareScannerService, useValue: scanner },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(DocumentsService);
  });

  it('rejects disallowed mime type', async () => {
    await expect(service.upload({ buffer: Buffer.from('x'), mimetype: 'application/zip', originalname: 'a.zip', size: 10 } as any, 'Vacancy', 'v1'))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects oversized file', async () => {
    await expect(service.upload({ buffer: Buffer.from('x'), mimetype: 'application/pdf', originalname: 'a.pdf', size: 26 * 1024 * 1024 } as any, 'Vacancy', 'v1'))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects when scanner flags file', async () => {
    scanner.scanStream.mockResolvedValueOnce({ clean: false });
    await expect(service.upload({ buffer: Buffer.from('x'), mimetype: 'application/pdf', originalname: 'a.pdf', size: 10 } as any, 'Vacancy', 'v1'))
      .rejects.toThrow(BadRequestException);
  });

  it('stores and records a clean PDF', async () => {
    const doc = await service.upload({ buffer: Buffer.from('pdf'), mimetype: 'application/pdf', originalname: 'a.pdf', size: 3 } as any, 'Vacancy', 'v1');
    expect(doc.id).toBe('d1');
    expect(storage.put).toHaveBeenCalled();
    expect(prisma.document.create).toHaveBeenCalled();
  });

  it('registerDownload increments count and logs a download', async () => {
    await service.registerDownload('d1');
    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { downloadCount: { increment: 1 } } });
    expect(prisma.documentDownload.create).toHaveBeenCalledWith({ data: { documentId: 'd1' } });
  });
});
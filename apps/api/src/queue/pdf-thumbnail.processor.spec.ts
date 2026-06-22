import { Readable } from 'stream';
import { StorageService } from '../documents/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { Job } from 'bullmq';

const mockConvert = jest.fn();
const mockTmpFile = { fd: 1, name: '/tmp/test.pdf', removeCallback: jest.fn() };

jest.mock('pdf2pic', () => ({
  fromPath: jest.fn().mockImplementation(() => mockConvert),
}));

jest.mock('tmp', () => ({
  fileSync: jest.fn().mockImplementation(() => mockTmpFile),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('png-bytes')),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

import { PdfThumbnailProcessor } from './pdf-thumbnail.processor';

describe('PdfThumbnailProcessor', () => {
  const storage = {
    getStream: jest.fn().mockResolvedValue(Readable.from([Buffer.from('pdf-bytes')])),
    put: jest.fn().mockResolvedValue(undefined),
    buildKey: jest.fn().mockReturnValue('NewsPost/n1/uuid-foo.pdf-thumb.png'),
  } as unknown as StorageService;

  const prisma = {
    document: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'd1',
        mimeType: 'application/pdf',
        filename: 'notice.pdf',
        storageKey: 'documents/notice.pdf',
      }),
    },
    newsPost: { update: jest.fn().mockResolvedValue({}) },
  } as unknown as PrismaService;

  let processor: PdfThumbnailProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConvert.mockResolvedValue({ path: '/tmp/thumb.png' });
    processor = new PdfThumbnailProcessor(storage, prisma);
  });

  it('generates a thumbnail for a PDF and updates the NewsPost cover image', async () => {
    await processor.process({ data: { documentId: 'd1', ownerType: 'NewsPost', ownerId: 'n1' } } as Job);

    expect(prisma.document.findUnique).toHaveBeenCalledWith({ where: { id: 'd1' } });
    expect(storage.getStream).toHaveBeenCalledWith('documents/notice.pdf');
    expect(storage.put).toHaveBeenCalledWith('NewsPost/n1/uuid-foo.pdf-thumb.png', Buffer.from('png-bytes'), 'image/png');
    expect(prisma.newsPost.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { coverImageKey: 'NewsPost/n1/uuid-foo.pdf-thumb.png' },
    });
  });

  it('skips non-PDF documents', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({
      id: 'd2',
      mimeType: 'image/png',
      filename: 'photo.png',
      storageKey: 'documents/photo.png',
    });

    await processor.process({ data: { documentId: 'd2', ownerType: 'NewsPost', ownerId: 'n2' } } as Job);

    expect(storage.getStream).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('gracefully skips when conversion fails', async () => {
    mockConvert.mockRejectedValue(new Error('ImageMagick not installed'));

    await processor.process({ data: { documentId: 'd1', ownerType: 'NewsPost', ownerId: 'n1' } } as Job);

    expect(storage.put).not.toHaveBeenCalled();
    expect(prisma.newsPost.update).not.toHaveBeenCalled();
  });
});

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StorageService } from '../documents/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from './queue.constants';
import { fromPath } from 'pdf2pic';
import * as tmp from 'tmp';
import { readFile, writeFile } from 'fs/promises';
import { Readable } from 'stream';

@Processor(QUEUES.pdfThumbnail)
@Injectable()
export class PdfThumbnailProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfThumbnailProcessor.name);

  constructor(private storage: StorageService, private prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ documentId: string; ownerType: string; ownerId: string }>) {
    const { documentId, ownerType, ownerId } = job.data;
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || !doc.mimeType.includes('pdf')) {
      this.logger.warn(`Skipping thumbnail: document ${documentId} not found or not a PDF`);
      return;
    }

    let tmpFile: tmp.FileResult | undefined;
    try {
      const stream = await this.storage.getStream(doc.storageKey);
      const buf = await streamToBuffer(stream);
      tmpFile = tmp.fileSync({ postfix: '.pdf' });
      await writeFile(tmpFile.name, buf);

      const convert = fromPath(tmpFile.name, { width: 800, height: 600, format: 'png' });
      const res = (await (convert as any)(1, { response: false })) as { path: string };
      const png = await readFile(res.path);

      const key = this.storage.buildKey(ownerType, ownerId, `${doc.filename}-thumb.png`);
      await this.storage.put(key, png, 'image/png');

      if (ownerType === 'NewsPost') {
        await this.prisma.newsPost.update({ where: { id: ownerId }, data: { coverImageKey: key } });
      }

      this.logger.log(`thumbnail generated for ${doc.filename}`);
    } catch (err) {
      this.logger.warn(`Thumbnail generation skipped for ${doc.filename}: ${(err as Error).message}`);
    } finally {
      tmpFile?.removeCallback();
    }
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

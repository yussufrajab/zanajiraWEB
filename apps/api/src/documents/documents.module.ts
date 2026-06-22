import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { MalwareScannerService } from './malware-scanner.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, MalwareScannerService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
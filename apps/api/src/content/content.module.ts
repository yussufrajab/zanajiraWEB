import { Module, Global } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { ContentVersionService } from './content-version.service';

@Global()
@Module({
  providers: [WorkflowService, ContentVersionService],
  exports: [WorkflowService, ContentVersionService],
})
export class ContentModule {}
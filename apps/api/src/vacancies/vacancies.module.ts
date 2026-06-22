import { Module } from '@nestjs/common';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({ imports: [DocumentsModule], controllers: [VacanciesController], providers: [VacanciesService], exports: [VacanciesService] })
export class VacanciesModule {}
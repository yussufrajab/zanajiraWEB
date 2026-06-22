import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { CacheModule } from './cache/cache.module';
import { ContentModule } from './content/content.module';
import { NewsModule } from './news/news.module';
import { VacanciesModule } from './vacancies/vacancies.module';
import { InterviewsModule } from './interviews/interviews.module';
import { SearchModule } from './search/search.module';
import { PagesModule } from './pages/pages.module';
import { DepartmentsModule } from './departments/departments.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    CacheModule,
    ContentModule,
    NewsModule,
    VacanciesModule,
    InterviewsModule,
    SearchModule,
    PagesModule,
    DepartmentsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
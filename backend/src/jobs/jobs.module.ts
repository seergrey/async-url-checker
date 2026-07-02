import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsStore } from './jobs.store';
import { UrlCheckerService } from './url-checker.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsStore, UrlCheckerService],
})
export class JobsModule {}

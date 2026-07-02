import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { JobDetails, JobSummary } from './models/job.model';

/**
 * REST API проверки списка URL. Базовый путь /api/jobs.
 */
@Controller('api/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /** Создать задание и запустить фоновую проверку. */
  @Post()
  async create(@Body() dto: CreateJobDto): Promise<{ jobId: string }> {
    return this.jobsService.createJob(dto.urls);
  }

  /** Список заданий (краткая информация). */
  @Get()
  getAll(): JobSummary[] {
    return this.jobsService.getAll();
  }

  /** Детальная информация по заданию. */
  @Get(':id')
  getById(@Param('id') id: string): JobDetails {
    return this.jobsService.getById(id);
  }

  /** Отменить задание. */
  @Delete(':id')
  @HttpCode(200)
  cancel(@Param('id') id: string): { id: string; status: string } {
    this.jobsService.cancel(id);
    return { id, status: 'cancelled' };
  }
}

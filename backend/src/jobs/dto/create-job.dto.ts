import { ArrayMaxSize, IsArray, IsString, Matches } from 'class-validator';
import { MAX_URLS_PER_JOB } from '../jobs.constants';

/** Тело запроса создания задания: POST /api/jobs. */
export class CreateJobDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_URLS_PER_JOB)
  @Matches(/^https?:\/\/.+/i, {
    each: true,
    message: 'each url must start with http:// or https://',
  })
  urls: string[];
}

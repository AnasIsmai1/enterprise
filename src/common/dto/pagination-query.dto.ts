import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Standard pagination query DTO.
 *
 * Validates pagination query parameters:
 * - page: minimum 1 (default 1)
 * - limit: minimum 1, maximum 100 (API-07) (default 20)
 * - sort: sort field (default created_at, API-09)
 * - order: ASC | DESC (default DESC, API-09)
 */
export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100) // API-07: max 100
  @Type(() => Number)
  limit: number = 20;

  @IsOptional()
  @IsString()
  sort: string = 'created_at'; // API-09: default sort

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC'; // API-09: default DESC
}

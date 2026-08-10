import { PaginationMeta } from '@/common/dto/pagination-meta.dto';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * `{ items, meta }` — the shape ResponseInterceptor unwraps into
 * `{ success, data: [...], meta: {...} }`.
 *
 * This previously spread page/limit/total at the top level, which did not match
 * the interceptor's check for `items` AND `meta`, so paginated endpoints silently
 * returned the raw object as `data` and never emitted pagination metadata.
 */
export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMeta;
}

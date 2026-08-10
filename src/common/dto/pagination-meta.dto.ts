/**
 * Pagination metadata DTO.
 *
 * Provides standardized pagination response metadata:
 * - page: current page number
 * - limit: items per page
 * - total: total item count
 * - total_pages: total number of pages
 * - has_more: whether more pages exist
 */
export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;

  static from(page: number, limit: number, total: number): PaginationMeta {
    return {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_more: page * limit < total,
    };
  }
}

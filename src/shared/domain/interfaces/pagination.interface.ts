export interface PaginationOptions {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
    total_pages: number;
}

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface PaginationResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

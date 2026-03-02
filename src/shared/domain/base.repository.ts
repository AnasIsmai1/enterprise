import { ObjectLiteral, Repository, SelectQueryBuilder, DeepPartial } from 'typeorm';
import { PaginationOptions, PaginationResult } from './interfaces/pagination.interface';
import { IRepository } from './interfaces/repository.interface';

/**
 * Optimistic locking pattern (SEC-11):
 * When updating a resource that may have concurrent modifications, include
 * `updated_at` in the WHERE clause to detect conflicts:
 *
 * const result = await repo.update(
 *   { id, updated_at: expectedUpdatedAt },
 *   updateData,
 * );
 * if (result.affected === 0) {
 *   throw new ConflictException('Resource was modified by another request');
 * }
 *
 * This prevents concurrent modifications from silently overwriting each other.
 * Apply this pattern in service methods for any resource that can be concurrently modified
 * (e.g., pet profiles, circles, capsules, memory pages).
 */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT = 'created_at';
const DEFAULT_ORDER = 'DESC';

export class BaseRepository<T extends ObjectLiteral & { id: string }> extends Repository<T> implements IRepository<T> {
    async findById(id: string): Promise<T | null> {
        return await super.findOne({ where: { id } as any });
    }

    async findAll(): Promise<T[]> {
        return await super.find();
    }

    async createEntity(entity: DeepPartial<T>): Promise<T> {
        const newEntity = super.create(entity);
        return await super.save(newEntity);
    }

    async updateEntity(id: string, entity: DeepPartial<T>): Promise<T | null> {
        await super.update(id, entity);
        return await this.findById(id);
    }

    async deleteEntity(id: string): Promise<void> {
        await super.delete(id);
    }

    async paginate(qb: SelectQueryBuilder<T>, options: PaginationOptions): Promise<PaginationResult<T>> {
        const page = options.page ?? 1;
        // Enforce max limit of 100 (API-07)
        const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
        const sort = options.sort ?? DEFAULT_SORT;
        const order = options.order ?? DEFAULT_ORDER;

        const alias = qb.alias;
        const sortColumn = `${alias}.${sort}`;

        const [items, total] = await qb
            .orderBy(sortColumn, order)
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        const total_pages = Math.ceil(total / limit);
        const has_more = page * limit < total;

        return {
            items,
            total,
            page,
            limit,
            has_more,
            total_pages,
        };
    }
}

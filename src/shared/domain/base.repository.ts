import { ObjectLiteral, Repository, SelectQueryBuilder, DeepPartial } from 'typeorm';
import { PaginationOptions, PaginationResult } from './interfaces/pagination.interface';
import { IRepository } from './interfaces/repository.interface';

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
        const { page = 1, limit = 10 } = options;
        const [items, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { items, total, page, limit };
    }
}

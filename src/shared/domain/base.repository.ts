import { ObjectLiteral, Repository, SelectQueryBuilder, DeepPartial } from 'typeorm';
import { PaginationOptions, PaginationResult } from './interfaces/pagination.interface';
import { IRepository } from './interfaces/repository.interface';

export class BaseRepository<T extends ObjectLiteral & { id: string }> extends Repository<T> implements IRepository<T> {
    async findById(id: string): Promise<T | null> {
        return await this.findOne({ where: { id } as any });
    }

    async findAll(): Promise<T[]> {
        return await this.find();
    }

    async createEntity(entity: DeepPartial<T>): Promise<T> {
        const newEntity = this.create(entity);
        return await this.save(newEntity);
    }

    async updateEntity(id: string, entity: DeepPartial<T>): Promise<T | null> {
        await this.update(id, entity);
        return await this.findById(id);
    }

    async deleteEntity(id: string): Promise<void> {
        await this.delete(id);
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

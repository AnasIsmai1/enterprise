import { ObjectLiteral, SelectQueryBuilder, DeepPartial } from 'typeorm';
import { PaginationOptions, PaginationResult } from './pagination.interface';

export interface IRepository<T extends ObjectLiteral> {
  findById(id: T['id']): Promise<T | null>;
  findAll(): Promise<T[]>;
  createEntity(entity: DeepPartial<T>): Promise<T>;
  updateEntity(id: T['id'], entity: DeepPartial<T>): Promise<T | null>;
  deleteEntity(id: T['id']): Promise<void>;
  paginate(
    qb: SelectQueryBuilder<T>,
    options: PaginationOptions
  ): Promise<PaginationResult<T>>;
}

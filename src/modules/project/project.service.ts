import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { PaginationResult } from '@/shared/domain/interfaces/pagination.interface';
import { PaginationMeta } from '@/common/dto/pagination-meta.dto';
import { AuditLogService } from '@/modules/audit/audit.service';

/** Columns a client may sort by. Anything else is an injection vector. */
const SORTABLE = new Set(['created_at', 'updated_at', 'name']);

/**
 * THE TENANCY PATTERN — copy this for every org-owned resource.
 *
 * 1. `organizationId` is a required first argument on every method. It comes
 *    from the session via @ActiveOrganization(), never from the request body.
 * 2. Every query filters on it, including the one behind an update or delete.
 * 3. A row belonging to another organization raises 404, not 403. A 403 confirms
 *    the id exists, which leaks the shape of other tenants' data.
 *
 * Getting this wrong is the single most damaging bug a multi-tenant API can
 * have, and it fails silently — the endpoint works, it just returns too much.
 */
@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    private readonly audit: AuditLogService
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateProjectDto
  ): Promise<Project> {
    const project = await this.projects.save(
      this.projects.create({
        ...dto,
        organization_id: organizationId,
        created_by: userId,
      })
    );

    await this.audit.log({
      action: 'PROJECT_CREATED',
      actorId: userId,
      resource: 'project',
      resourceId: project.id,
      organizationId,
    });

    return project;
  }

  async findAll(
    organizationId: string,
    query: PaginationQueryDto
  ): Promise<PaginationResult<Project>> {
    const { page, limit, order } = query;
    // Allow-list the sort column — it is interpolated into the query.
    const sort = SORTABLE.has(query.sort) ? query.sort : 'created_at';

    const [items, total] = await this.projects.findAndCount({
      where: { organization_id: organizationId },
      order: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, meta: PaginationMeta.from(page, limit, total) };
  }

  async findOne(organizationId: string, id: string): Promise<Project> {
    const project = await this.projects.findOne({
      where: { id, organization_id: organizationId },
    });

    // 404, not 403 — see the class comment.
    if (!project) throw new NotFoundException('Project not found');

    return project;
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateProjectDto
  ): Promise<Project> {
    // Re-read through findOne so the tenant filter applies to the update too.
    const project = await this.findOne(organizationId, id);

    Object.assign(project, dto);
    const saved = await this.projects.save(project);

    await this.audit.log({
      action: 'PROJECT_UPDATED',
      actorId: userId,
      resource: 'project',
      resourceId: id,
      organizationId,
    });

    return saved;
  }

  async remove(
    organizationId: string,
    userId: string,
    id: string
  ): Promise<void> {
    const project = await this.findOne(organizationId, id);

    await this.projects.softRemove(project);

    await this.audit.log({
      action: 'PROJECT_DELETED',
      actorId: userId,
      resource: 'project',
      resourceId: id,
      organizationId,
    });
  }
}

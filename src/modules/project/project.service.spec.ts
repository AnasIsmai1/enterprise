/* eslint-disable @typescript-eslint/unbound-method --
   expect(repo.findOne) references the mock, it never invokes it detached, so the
   unbound-this warning does not apply to assertions on jest mocks. */
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProjectService } from './project.service';
import { Project } from './project.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

const ORG_A = 'org_a';
const ORG_B = 'org_b';
const USER = 'user_1';

/**
 * These tests exist for one reason: to fail if the tenant filter is ever dropped
 * from a query. That bug does not throw, does not log, and does not show up in
 * manual testing from a single account — it just quietly serves other tenants'
 * rows.
 */
describe('ProjectService tenancy', () => {
  let repo: jest.Mocked<Repository<Project>>;
  let audit: jest.Mocked<AuditLogService>;
  let service: ProjectService;

  beforeEach(() => {
    repo = {
      create: jest.fn((v: Partial<Project>) => v as Project),
      save: jest.fn((v: Partial<Project>) =>
        Promise.resolve({ id: 'p1', ...v } as Project)
      ),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      softRemove: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<Project>>;

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new ProjectService(repo, audit);
  });

  it('stamps the caller organization on create, never the request body', async () => {
    await service.create(ORG_A, USER, { name: 'Site' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: ORG_A, created_by: USER })
    );
  });

  it('filters list queries by organization', async () => {
    await service.findAll(ORG_A, new PaginationQueryDto());

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organization_id: ORG_A } })
    );
  });

  it('scopes findOne to the organization', async () => {
    repo.findOne.mockResolvedValue({ id: 'p1' } as Project);

    await service.findOne(ORG_A, 'p1');

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'p1', organization_id: ORG_A },
    });
  });

  it("raises 404 — not 403 — for another organization's row", async () => {
    // The repository finds nothing because the tenant filter excluded it.
    repo.findOne.mockResolvedValue(null);

    // 403 would confirm the id exists, leaking the other tenant's data shape.
    await expect(service.findOne(ORG_B, 'p1')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('refuses to update across tenants', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.update(ORG_B, USER, 'p1', { name: 'hijacked' })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('refuses to delete across tenants', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.remove(ORG_B, USER, 'p1')).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(repo.softRemove).not.toHaveBeenCalled();
  });

  it('rejects an arbitrary sort column instead of interpolating it', async () => {
    const query = new PaginationQueryDto();
    query.sort = 'name; DROP TABLE projects';

    await service.findAll(ORG_A, query);

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { created_at: 'DESC' } })
    );
  });

  it('records an audit entry scoped to the organization', async () => {
    await service.create(ORG_A, USER, { name: 'Site' });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_CREATED',
        actorId: USER,
        organizationId: ORG_A,
      })
    );
  });
});

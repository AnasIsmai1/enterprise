import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ActiveOrganization } from '@/modules/auth/active-organization.decorator';
import { OrgRoles, OrgRolesGuard } from '@/modules/auth/org-roles.guard';

/**
 * Reference CRUD controller for an organization-owned resource.
 *
 * Conventions worth copying:
 * - AuthGuard is global, so no @UseGuards for authentication.
 * - @ActiveOrganization() supplies the tenant; the body never does.
 * - Reads are open to any member; writes require admin or owner.
 * - ResponseInterceptor wraps returns in { success, data } — return plain values.
 */
@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller('projects')
@UseGuards(OrgRolesGuard)
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  @Post()
  @OrgRoles('owner', 'admin')
  @ApiOperation({ summary: 'Create a project in the active organization' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 400, description: 'No active organization' })
  @ApiResponse({ status: 403, description: 'Requires owner or admin' })
  create(
    @ActiveOrganization() organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto
  ) {
    return this.projects.create(organizationId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects in the active organization' })
  findAll(
    @ActiveOrganization() organizationId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.projects.findAll(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one project' })
  @ApiResponse({
    status: 404,
    description: 'Not found, or owned by another org',
  })
  findOne(
    @ActiveOrganization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.projects.findOne(organizationId, id);
  }

  @Patch(':id')
  @OrgRoles('owner', 'admin')
  @ApiOperation({ summary: 'Update a project' })
  update(
    @ActiveOrganization() organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto
  ) {
    return this.projects.update(organizationId, userId, id, dto);
  }

  @Delete(':id')
  @OrgRoles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project' })
  remove(
    @ActiveOrganization() organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.projects.remove(organizationId, userId, id);
  }
}

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Website redesign', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ example: 'Q3 marketing site refresh' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

/**
 * PartialType makes every field optional and carries the validators over, so
 * the constraints cannot drift between create and update.
 *
 * Note there is no `organizationId` here, on purpose: tenancy comes from the
 * session, never from the request body. A client that could name its own
 * organization could write into someone else's.
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

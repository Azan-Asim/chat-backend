import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['public', 'private'])
  type?: string;
}

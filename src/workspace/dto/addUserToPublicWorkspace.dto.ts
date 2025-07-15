import { IsString } from "class-validator";

export class AddUserToPublicWorkspaceDto {
  @IsString()
  workspaceId: string;
  
  @IsString()
  userId: string;
}

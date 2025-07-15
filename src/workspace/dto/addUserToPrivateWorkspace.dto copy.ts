import { IsString } from "class-validator";

export class AddUserToPrivateWorkspaceDto {
  @IsString()
  workspaceId: string;
  
  @IsString()
  userId: string;
}

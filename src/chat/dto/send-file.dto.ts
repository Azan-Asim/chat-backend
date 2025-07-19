import { IsString, IsNotEmpty } from 'class-validator';

export class SendFileDto {
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}

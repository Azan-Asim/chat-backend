import { IsString, IsNotEmpty } from 'class-validator';

export class editMessageDto {
  @IsString()
  @IsNotEmpty()
  message_text: string;

}

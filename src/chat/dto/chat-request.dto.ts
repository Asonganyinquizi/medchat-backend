import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChatRequestDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}

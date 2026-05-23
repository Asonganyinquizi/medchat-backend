import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatHistoryMessageDto, ChatResponseDto } from './dto/chat-response.dto';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  sendMessage(@Body() chatRequestDto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.sendMessage(
      chatRequestDto.sessionId,
      chatRequestDto.message,
    );
  }

  @Get(':sessionId/messages')
  getSessionMessages(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ): Promise<ChatHistoryMessageDto[]> {
    return this.chatService.getSessionMessages(sessionId);
  }
}

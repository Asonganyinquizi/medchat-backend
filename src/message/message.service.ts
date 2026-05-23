import { Injectable } from '@nestjs/common';
import { Message, MessageRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    groqLatencyMs?: number,
  ): Promise<Message> {
    return this.prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        groqLatencyMs: groqLatencyMs ?? null,
      },
    });
  }
}

export { MessageRole };

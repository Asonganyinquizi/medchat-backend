import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(id?: string): Promise<Session> {
    return this.prisma.session.create({
      data: id ? { id } : {},
    });
  }

  async getSession(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async ensureSession(id: string): Promise<Session> {
    const existing = await this.getSession(id);
    if (existing) return existing;
    return this.createSession(id);
  }

  async getAllSessions(): Promise<Session[]> {
    return this.prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSessionSummary(id: string, summary: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { summary },
    });
  }
}

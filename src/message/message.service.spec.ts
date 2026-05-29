import { MessageRole } from '@prisma/client';
import { MessageService } from './message.service';
import { PrismaService } from '../database/prisma.service';

const SESSION_ID = '1a348a8d-cb26-4db2-977a-49e884058219';

function createPrismaMock() {
  return {
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('MessageService', () => {
  it('saves a message with role, sessionId, content and latency', async () => {
    const prisma = createPrismaMock();
    const service = new MessageService(prisma);
    const saved = {
      id: 'msg-1',
      sessionId: SESSION_ID,
      role: MessageRole.assistant,
      content: 'Test',
      groqLatencyMs: 321,
    };
    (prisma.message.create as jest.Mock).mockResolvedValue(saved);

    const result = await service.saveMessage(
      SESSION_ID,
      MessageRole.assistant,
      'Test',
      321,
    );

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        sessionId: SESSION_ID,
        role: MessageRole.assistant,
        content: 'Test',
        groqLatencyMs: 321,
      },
    });
    expect(result).toEqual(saved);
  });

  it('saves a message without latency defaulting to null', async () => {
    const prisma = createPrismaMock();
    const service = new MessageService(prisma);
    (prisma.message.create as jest.Mock).mockResolvedValue({});

    await service.saveMessage(SESSION_ID, MessageRole.user, 'Hello');

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        sessionId: SESSION_ID,
        role: MessageRole.user,
        content: 'Hello',
        groqLatencyMs: null,
      },
    });
  });

  it('returns messages in chronological order for a session', async () => {
    const prisma = createPrismaMock();
    const service = new MessageService(prisma);
    const messages = [
      {
        id: 'msg-1',
        sessionId: SESSION_ID,
        role: MessageRole.user,
        content: 'Question',
      },
      {
        id: 'msg-2',
        sessionId: SESSION_ID,
        role: MessageRole.assistant,
        content: 'Answer',
      },
    ];
    (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);

    const result = await service.getMessagesBySession(SESSION_ID);

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { sessionId: SESSION_ID },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(2);
    expect(result).toEqual(messages);
  });

  it('returns empty array when no messages exist for session', async () => {
    const prisma = createPrismaMock();
    const service = new MessageService(prisma);
    (prisma.message.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getMessagesBySession(SESSION_ID);

    expect(result).toHaveLength(0);
  });
});

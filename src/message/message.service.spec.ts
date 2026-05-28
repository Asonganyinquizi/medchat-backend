import { Message, MessageRole } from './message.entity';
import { MessageService } from './message.service';

type MessageRepositoryMock = {
  create: jest.Mock<Message, [Partial<Message>]>;
  save: jest.Mock<Promise<Message>, [Message]>;
  find: jest.Mock<
    Promise<Message[]>,
    [{ where: { sessionId: string }; order: { createdAt: 'ASC' } }]
  >;
};

function createRepositoryMock(): MessageRepositoryMock {
  return {
    create: jest.fn((message: Partial<Message>) => message),
    save: jest.fn(async (message: Message) => message),
    find: jest.fn(),
  };
}

describe('MessageService', () => {
  it('saves messages with role, session id, content, and optional Groq latency', async () => {
    const repository = createRepositoryMock();
    const service = new MessageService(repository as never);

    await service.saveMessage(
      '1a348a8d-cb26-4db2-977a-49e884058219',
      MessageRole.Assistant,
      'Metformin reduces hepatic gluconeogenesis.',
      321,
    );

    expect(repository.create).toHaveBeenCalledWith({
      sessionId: '1a348a8d-cb26-4db2-977a-49e884058219',
      role: MessageRole.Assistant,
      content: 'Metformin reduces hepatic gluconeogenesis.',
      groqLatencyMs: 321,
    });
    expect(repository.save).toHaveBeenCalled();
  });

  it('returns messages in chronological order for a session', async () => {
    const repository = createRepositoryMock();
    const service = new MessageService(repository as never);
    const sessionId = '1a348a8d-cb26-4db2-977a-49e884058219';

    repository.find.mockResolvedValue([
      { sessionId, role: MessageRole.User, content: 'Question' } as Message,
      { sessionId, role: MessageRole.Assistant, content: 'Answer' } as Message,
    ]);

    const messages = await service.getMessagesBySession(sessionId);

    expect(messages).toHaveLength(2);
    expect(repository.find).toHaveBeenCalledWith({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  });
});

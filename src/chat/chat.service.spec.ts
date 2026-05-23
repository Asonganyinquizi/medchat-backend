import { ConfigService } from '@nestjs/config';
import { Message, MessageRole } from '../message/message.entity';
import { MessageService } from '../message/message.service';
import { SessionService } from '../session/session.service';
import { ChatService, MEDICAL_SYSTEM_PROMPT } from './chat.service';

type MockGroqCreate = jest.Mock<
  Promise<{ choices: Array<{ message: { content: string } }> }>,
  [unknown]
>;

type MockGroqClient = {
  chat: {
    completions: {
      create: MockGroqCreate;
    };
  };
};

function createChatService() {
  const configService = {
    get: jest.fn(() => 'test-groq-key'),
  } as unknown as ConfigService;
  const sessionService = {
    ensureSession: jest.fn(async () => ({
      id: '1a348a8d-cb26-4db2-977a-49e884058219',
    })),
  } as unknown as jest.Mocked<SessionService>;
  const messageService = {
    getMessagesBySession: jest.fn(),
    saveMessage: jest.fn(),
  } as unknown as jest.Mocked<MessageService>;
  const service = new ChatService(configService, sessionService, messageService);
  const groqCreate = jest.fn(async () => ({
    choices: [{ message: { content: 'Metformin primarily reduces hepatic glucose output.' } }],
  }));
  const groqClient: MockGroqClient = {
    chat: {
      completions: {
        create: groqCreate,
      },
    },
  };

  (service as unknown as { groq: MockGroqClient }).groq = groqClient;

  return { service, sessionService, messageService, groqCreate };
}

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prepends the medical system prompt before every Groq request', async () => {
    const { service, messageService, groqCreate } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([]);
    messageService.saveMessage.mockResolvedValue({} as Message);

    await service.sendMessage(
      '1a348a8d-cb26-4db2-977a-49e884058219',
      'What is the mechanism of action of metformin?',
    );

    const request = groqCreate.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };

    expect(request.messages[0]).toEqual({
      role: 'system',
      content: MEDICAL_SYSTEM_PROMPT,
    });
    expect(request.messages.at(-1)).toEqual({
      role: 'user',
      content: 'What is the mechanism of action of metformin?',
    });
  });

  it('passes previous medical conversation history to Groq', async () => {
    const { service, messageService, groqCreate } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([
      {
        role: MessageRole.User,
        content: 'Explain hypertension.',
      } as Message,
      {
        role: MessageRole.Assistant,
        content: 'Hypertension is sustained elevated blood pressure.',
      } as Message,
    ]);
    messageService.saveMessage.mockResolvedValue({} as Message);

    await service.sendMessage(
      '1a348a8d-cb26-4db2-977a-49e884058219',
      'What medications are commonly researched?',
    );

    const request = groqCreate.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };

    expect(request.messages).toEqual(
      expect.arrayContaining([
        { role: 'user', content: 'Explain hypertension.' },
        {
          role: 'assistant',
          content: 'Hypertension is sustained elevated blood pressure.',
        },
      ]),
    );
  });

  it('saves both user and assistant messages and records Groq latency', async () => {
    const { service, messageService } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([]);
    messageService.saveMessage.mockResolvedValue({} as Message);

    await service.sendMessage(
      '1a348a8d-cb26-4db2-977a-49e884058219',
      'Summarise phase 2 clinical trials.',
    );

    expect(messageService.saveMessage).toHaveBeenNthCalledWith(
      1,
      '1a348a8d-cb26-4db2-977a-49e884058219',
      MessageRole.User,
      'Summarise phase 2 clinical trials.',
    );
    expect(messageService.saveMessage).toHaveBeenNthCalledWith(
      2,
      '1a348a8d-cb26-4db2-977a-49e884058219',
      MessageRole.Assistant,
      'Metformin primarily reduces hepatic glucose output.',
      expect.any(Number),
    );
  });

  it('turns Groq rate limit failures into a 429 response', async () => {
    const { service, messageService, groqCreate } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([]);
    messageService.saveMessage.mockResolvedValue({} as Message);
    groqCreate.mockRejectedValue({ status: 429, message: 'Rate limit exceeded' });

    await expect(
      service.sendMessage(
        '1a348a8d-cb26-4db2-977a-49e884058219',
        'What are beta blockers?',
      ),
    ).rejects.toMatchObject({ status: 429 });
  });
});

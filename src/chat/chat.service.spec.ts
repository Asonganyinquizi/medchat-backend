import { ConfigService } from '@nestjs/config';
import { MessageRole } from '@prisma/client';
import { MessageService } from '../message/message.service';
import { SessionService } from '../session/session.service';
import { ChatService, MEDICAL_SYSTEM_PROMPT } from './chat.service';

const SESSION_ID = '1a348a8d-cb26-4db2-977a-49e884058219';

type MockGroqClient = {
  chat: {
    completions: {
      create: jest.Mock;
    };
  };
};

function createChatService() {
  const configService = {
    get: jest.fn(() => 'test-groq-key'),
  } as unknown as ConfigService;

  const sessionService = {
    ensureSession: jest.fn().mockResolvedValue({ id: SESSION_ID }),
    updateSessionSummary: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SessionService>;

  const messageService = {
    getMessagesBySession: jest.fn(),
    saveMessage: jest.fn(),
  } as unknown as jest.Mocked<MessageService>;

  const service = new ChatService(
    configService,
    sessionService,
    messageService,
  );

  const groqCreate = jest.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: 'Metformin primarily reduces hepatic glucose output.',
        },
      },
    ],
  });

  const groqClient: MockGroqClient = {
    chat: { completions: { create: groqCreate } },
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
    messageService.saveMessage.mockResolvedValue({});

    await service.sendMessage(
      SESSION_ID,
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

  it('passes previous conversation history to Groq', async () => {
    const { service, messageService, groqCreate } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([
      { role: MessageRole.user, content: 'Explain hypertension.' } as never,
      {
        role: MessageRole.assistant,
        content: 'Hypertension is elevated blood pressure.',
      } as never,
    ]);
    messageService.saveMessage.mockResolvedValue({});

    await service.sendMessage(
      SESSION_ID,
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
          content: 'Hypertension is elevated blood pressure.',
        },
      ]),
    );
  });

  it('saves both user and assistant messages with Groq latency', async () => {
    const { service, messageService } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([]);
    messageService.saveMessage.mockResolvedValue({});

    await service.sendMessage(SESSION_ID, 'Summarise phase 2 clinical trials.');

    expect(messageService.saveMessage).toHaveBeenNthCalledWith(
      1,
      SESSION_ID,
      MessageRole.user,
      'Summarise phase 2 clinical trials.',
    );
    expect(messageService.saveMessage).toHaveBeenNthCalledWith(
      2,
      SESSION_ID,
      MessageRole.assistant,
      'Metformin primarily reduces hepatic glucose output.',
      expect.any(Number),
    );
  });

  it('turns Groq rate limit failures into a 429 response', async () => {
    const { service, messageService, groqCreate } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([]);
    messageService.saveMessage.mockResolvedValue({});
    groqCreate.mockRejectedValue({
      status: 429,
      message: 'Rate limit exceeded',
    });

    await expect(
      service.sendMessage(SESSION_ID, 'What are beta blockers?'),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('returns reply with sessionId and timestamp', async () => {
    const { service, messageService } = createChatService();
    messageService.getMessagesBySession.mockResolvedValue([]);
    messageService.saveMessage.mockResolvedValue({});

    const result = await service.sendMessage(SESSION_ID, 'What is aspirin?');

    expect(result).toMatchObject({
      reply: 'Metformin primarily reduces hepatic glucose output.',
      sessionId: SESSION_ID,
      timestamp: expect.any(String),
    });
  });
});

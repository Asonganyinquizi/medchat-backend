import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import tracer from 'dd-trace';
import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { Message, MessageRole } from '@prisma/client';
import { MessageService } from '../message/message.service';
import { SessionService } from '../session/session.service';
import {
  ChatHistoryMessageDto,
  ChatResponseDto,
} from './dto/chat-response.dto';

const MEDICAL_SYSTEM_PROMPT = `You are a Medical Research Assistant. You help medical students, researchers, and healthcare professionals understand biomedical concepts, clinical research, drug mechanisms, disease pathophysiology, and medical literature.

Rules you must always follow:
1. Only answer questions related to medicine, biology, pharmacology, clinical research, or healthcare.
2. If a question is outside medical/scientific scope, politely decline and redirect to medical topics.
3. Always end responses that involve clinical decisions with: "Warning: This is AI-generated information for research purposes only. Always consult a licensed healthcare professional for clinical decisions."
4. When medical evidence is uncertain or contested, clearly state that.
5. Cite limitations in your knowledge where relevant.`;

type GroqErrorShape = {
  status?: unknown;
  message?: unknown;
};

@Injectable()
export class ChatService {
  private readonly groq: Groq;
  private readonly model = 'llama-3.3-70b-versatile';

  constructor(
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly messageService: MessageService,
  ) {
    this.groq = new Groq({
      apiKey:
        this.configService.get<string>('GROQ_API_KEY') ?? 'missing-api-key',
    });
  }

  async sendMessage(
    sessionId: string,
    rawMessage: string,
  ): Promise<ChatResponseDto> {
    const sanitizedMessage = this.sanitizeUserMessage(rawMessage);
    await this.sessionService.ensureSession(sessionId);

    const history = await this.messageService.getMessagesBySession(sessionId);
    if (history.length === 0) {
      // First message, set it as summary
      await this.sessionService.updateSessionSummary(
        sessionId,
        sanitizedMessage.substring(0, 50),
      );
    }

    const messages = this.buildGroqMessages(history, sanitizedMessage);
    await this.messageService.saveMessage(
      sessionId,
      MessageRole.user,
      sanitizedMessage,
    );

    const startedAt = Date.now();
    const span = tracer.startSpan('groq.chat.completions.create', {
      tags: {
        session_id: sessionId,
        model: this.model,
      },
    });

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.2,
        max_completion_tokens: 1024,
      });
      const latencyMs = Date.now() - startedAt;
      span.setTag('groq_latency_ms', latencyMs);

      const reply =
        completion.choices[0]?.message?.content?.trim() ??
        'I could not generate a response for that medical research question.';

      await this.messageService.saveMessage(
        sessionId,
        MessageRole.assistant,
        reply,
        latencyMs,
      );

      return {
        reply,
        sessionId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      span.setTag('error', true);
      span.setTag('error.message', this.getErrorMessage(error));
      this.handleGroqError(error);
    } finally {
      span.finish();
    }
  }

  async getSessionMessages(
    sessionId: string,
  ): Promise<ChatHistoryMessageDto[]> {
    await this.sessionService.ensureSession(sessionId);
    const messages = await this.messageService.getMessagesBySession(sessionId);

    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
    }));
  }

  private buildGroqMessages(
    history: Message[],
    currentMessage: string,
  ): ChatCompletionMessageParam[] {
    const conversationHistory: ChatCompletionMessageParam[] = history.map(
      (message) => ({
        role: message.role,
        content: message.content,
      }),
    );

    return [
      { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: currentMessage },
    ];
  }

  private sanitizeUserMessage(message: string): string {
    return (
      message
        // eslint-disable-next-line no-control-regex -- intentionally strips control characters from user input
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('status' in error)) {
      return undefined;
    }

    const status = (error as GroqErrorShape).status;
    return typeof status === 'number' ? status : undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as GroqErrorShape).message;
      return typeof message === 'string' ? message : 'Unknown Groq API error';
    }

    return 'Unknown Groq API error';
  }

  private handleGroqError(error: unknown): never {
    const status = this.getErrorStatus(error);

    if (status === 429) {
      throw new HttpException(
        "You've sent too many messages. Please wait a moment before trying again.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (status && status >= 500) {
      throw new BadGatewayException(
        'Groq AI service returned an upstream error.',
      );
    }

    throw new ServiceUnavailableException(
      'Could not connect to the AI service. Please check your connection and try again.',
    );
  }
}

export { MEDICAL_SYSTEM_PROMPT };

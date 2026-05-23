export interface ChatResponseDto {
  reply: string;
  sessionId: string;
  timestamp: string;
}

export interface ChatHistoryMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

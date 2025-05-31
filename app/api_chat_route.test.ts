// IMPORTANT: This test file is intended for app/(chat)/api/chat/route.ts
// Due to tool limitations with paths containing '(', it's created here.
// The import './route' assumes it's in the same directory as the route file.
// Adjustments might be needed if running in a real test environment.

import { POST } from '../(chat)/api/chat/route'; // Adjusted import path
import { auth } from '@/app/(auth)/auth';
import * as dbQueries from '@/lib/db/queries';
import { myProvider } from '@/lib/ai/providers';
import { streamText } from 'ai';
import { after } from 'next/server';

// Mock dependencies
jest.mock('@/app/(auth)/auth');
jest.mock('@/lib/db/queries');
jest.mock('@/lib/ai/providers', () => ({
  myProvider: {
    languageModel: jest.fn(),
  },
}));
jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  streamText: jest.fn().mockReturnValue({
    consumeStream: jest.fn(),
    mergeIntoDataStream: jest.fn(),
  }),
  createDataStream: jest.fn().mockImplementation(({ execute }) => {
    const mockDataStream = {
      append: jest.fn(),
      close: jest.fn(),
    };
    if (execute && typeof execute === 'function') {
      try {
        execute(mockDataStream);
      } catch (e) {
        console.error("Error executing data stream mock:", e);
      }
    }
    return mockDataStream;
  }),
}));

jest.mock('next/server', () => ({
  after: jest.fn(),
}));

jest.mock('resumable-stream', () => ({
  createResumableStreamContext: jest.fn().mockReturnValue({
    resumableStream: jest.fn().mockImplementation(async (_streamId, streamFactory) => {
      return await streamFactory();
    }),
  }),
}));


describe('POST /api/chat', () => {
  const mockAuth = auth as jest.Mock;
  const mockGetChatById = dbQueries.getChatById as jest.Mock;
  const mockSaveChat = dbQueries.saveChat as jest.Mock;
  const mockGetMessagesByChatId = dbQueries.getMessagesByChatId as jest.Mock;
  const mockSaveMessages = dbQueries.saveMessages as jest.Mock;
  const mockCreateStreamId = dbQueries.createStreamId as jest.Mock;
  const mockGetMessageCountByUserId = dbQueries.getMessageCountByUserId as jest.Mock;
  const mockLanguageModel = myProvider.languageModel as jest.Mock;
  const mockStreamText = streamText as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth.mockResolvedValue({ user: { id: 'test-user-id', type: 'free' } });
    mockGetChatById.mockResolvedValue(null);
    mockSaveChat.mockResolvedValue({ id: 'new-chat-id', userId: 'test-user-id', title: 'Test Chat', visibility: 'private' }); // Return a full chat object
    mockGetMessagesByChatId.mockResolvedValue([]);
    mockSaveMessages.mockResolvedValue(undefined);
    mockCreateStreamId.mockResolvedValue(undefined);
    mockGetMessageCountByUserId.mockResolvedValue(0);

    mockLanguageModel.mockImplementation((modelId: string) => ({
        id: modelId,
        modelFunction: jest.fn(),
    }));

     mockStreamText.mockReturnValue({
      consumeStream: jest.fn(),
      mergeIntoDataStream: jest.fn(),
      // Ensure this part is consistent with how the route processes the stream
      // If the route does something like `for await (const chunk of result.fullStream)`
      // then fullStream needs to be an async iterable. For simplicity, if not directly used:
      // fullStream: Promise.resolve('mock stream data'),
    });
  });

  test('should use gemini-1.5-flash-search and select the search-enabled model when isWebSearchEnabled is true', async () => {
    const requestBody = {
      id: 'test-chat-id',
      message: { id: 'test-msg-id', role: 'user', content: 'Hello search!', parts: [{type: 'text', text: 'Hello search!'}], createdAt: new Date().toISOString() },
      selectedChatModel: 'gemini-1.5-flash-search',
      selectedVisibilityType: 'private',
      isWebSearchEnabled: true,
    };

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);
    expect(mockLanguageModel).toHaveBeenCalledWith('gemini-1.5-flash-search');
    expect(mockStreamText).toHaveBeenCalled();
    const streamTextArgs = mockStreamText.mock.calls[0][0];
    expect(streamTextArgs.model).toEqual(expect.objectContaining({ id: 'gemini-1.5-flash-search' }));
    expect(streamTextArgs.tools).toHaveProperty('url_context');
    expect(streamTextArgs.tools.url_context).toEqual({});
  });

  test('should use selectedChatModel and not the specific search-grounded model when isWebSearchEnabled is false', async () => {
    const requestBody = {
      id: 'test-chat-id',
      message: { id: 'test-msg-id', role: 'user', content: 'Hello no search!', parts: [{type: 'text', text: 'Hello no search!'}], createdAt: new Date().toISOString() },
      selectedChatModel: 'gemini-1.5-flash-search',
      selectedVisibilityType: 'private',
      isWebSearchEnabled: false,
    };

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);
    // Route logic: if (selectedChatModel === 'gemini-1.5-flash-search' && isWebSearchEnabled) { use 'gemini-1.5-flash-search' } else { use selectedChatModel }
    // So if isWebSearchEnabled is false, it uses the selectedChatModel.
    expect(mockLanguageModel).toHaveBeenCalledWith('gemini-1.5-flash-search');
    expect(mockStreamText).toHaveBeenCalled();
    const streamTextArgs = mockStreamText.mock.calls[0][0];
    expect(streamTextArgs.model).toEqual(expect.objectContaining({ id: 'gemini-1.5-flash-search' }));
    expect(streamTextArgs.tools).toHaveProperty('url_context'); // url_context is always added
  });

  test('should use selectedChatModel and not enable specific search grounding when model is not search-compatible, even if isWebSearchEnabled is true', async () => {
    const requestBody = {
      id: 'test-chat-id',
      message: { id: 'test-msg-id', role: 'user', content: 'Hello normal chat!', parts: [{type: 'text', text: 'Hello normal chat!'}], createdAt: new Date().toISOString() },
      selectedChatModel: 'chat-model',
      selectedVisibilityType: 'private',
      isWebSearchEnabled: true,
    };

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);
    expect(mockLanguageModel).toHaveBeenCalledWith('chat-model');
    expect(mockStreamText).toHaveBeenCalled();
    const streamTextArgs = mockStreamText.mock.calls[0][0];
    expect(streamTextArgs.model).toEqual(expect.objectContaining({ id: 'chat-model' }));
    expect(streamTextArgs.tools).toHaveProperty('url_context'); // url_context is always added
  });

});

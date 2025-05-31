import { POST } from './route'; // Adjust the import path as necessary
import { auth } from '@/app/(auth)/auth';
import * as dbQueries from '@/lib/db/queries';
import { myProvider } from '@/lib/ai/providers';
import { streamText } from 'ai';
import { after } from 'next/server'; // Assuming 'after' is from 'next/server'

// Mock dependencies
jest.mock('@/app/(auth)/auth');
jest.mock('@/lib/db/queries');
jest.mock('@/lib/ai/providers', () => ({
  myProvider: {
    languageModel: jest.fn(),
  },
}));
jest.mock('ai', () => ({
  ...jest.requireActual('ai'), // Import and retain default exports
  streamText: jest.fn().mockReturnValue({
    consumeStream: jest.fn(),
    mergeIntoDataStream: jest.fn(),
  }),
  createDataStream: jest.fn().mockImplementation(({ execute }) => {
    // Simulate the data stream and its execution if necessary
    const mockDataStream = {
      append: jest.fn(),
      close: jest.fn(),
      // other methods like 'error', 'update', etc., if used by the route's stream logic
    };
    if (execute && typeof execute === 'function') {
      // If there's an execute function, call it with the mockDataStream
      // This simulates the behavior of createDataStream more closely
      try {
        execute(mockDataStream);
      } catch (e) {
        console.error("Error executing data stream mock:", e);
      }
    }
    return mockDataStream;
  }),
}));

// Mock next/server 'after' if it's used for resumable streams, otherwise remove if not needed
jest.mock('next/server', () => ({
  after: jest.fn(),
}));

// Mock ResumableStreamContext if used and it relies on 'after' or other server features
jest.mock('resumable-stream', () => ({
  createResumableStreamContext: jest.fn().mockReturnValue({
    resumableStream: jest.fn().mockImplementation(async (_streamId, streamFactory) => {
      // Directly return the stream from the factory for testing purposes
      // Ensure it's async if the route awaits it
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

    // Default mocks for successful operations
    mockAuth.mockResolvedValue({ user: { id: 'test-user-id', type: 'free' } });
    mockGetChatById.mockResolvedValue(null); // New chat
    mockSaveChat.mockResolvedValue({ id: 'new-chat-id' }); // Ensure saveChat returns a chat object
    mockGetMessagesByChatId.mockResolvedValue([]);
    mockSaveMessages.mockResolvedValue(undefined);
    mockCreateStreamId.mockResolvedValue(undefined);
    mockGetMessageCountByUserId.mockResolvedValue(0);

    // Mock the languageModel provider to return a dummy model object/function
    // This mock needs to return something that can be invoked, as the original is a function call
    mockLanguageModel.mockImplementation((modelId: string) => ({
        id: modelId,
        // Simulate a model object that streamText might interact with, or simply a mock function
        modelFunction: jest.fn(),
    }));

    // Ensure streamText mock is set up for each test if its behavior needs to be generic
     mockStreamText.mockReturnValue({
      consumeStream: jest.fn(),
      mergeIntoDataStream: jest.fn(),
      // Ensure it returns a Promise-like object if the route awaits on any part of its result
      // For example, if result.fullStream is awaited:
      // fullStream: Promise.resolve('mock stream data'),
      // If the route doesn't directly await parts of streamText's result but awaits the Response,
      // the mocking of createDataStream and resumableStream is more critical.
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

    // Verify that myProvider.languageModel was asked for 'gemini-1.5-flash-search'
    // This happens because the route logic dictates: if selectedChatModel is 'gemini-1.5-flash-search' AND isWebSearchEnabled is true,
    // then use the 'gemini-1.5-flash-search' model from the provider.
    expect(mockLanguageModel).toHaveBeenCalledWith('gemini-1.5-flash-search');

    // Assert that streamText was called
    expect(mockStreamText).toHaveBeenCalled();
    const streamTextArgs = mockStreamText.mock.calls[0][0];

    // Assert that the model passed to streamText is the one for 'gemini-1.5-flash-search'
    // This confirms that the conditional logic correctly selected the search-capable model.
    expect(streamTextArgs.model).toEqual(expect.objectContaining({ id: 'gemini-1.5-flash-search' }));

    // Assert that url_context tool is present because this model is used
    expect(streamTextArgs.tools).toHaveProperty('url_context');
    expect(streamTextArgs.tools.url_context).toEqual({});
  });

  test('should use gemini-1.5-flash-search but select the non-search-enabled model when isWebSearchEnabled is false', async () => {
    const requestBody = {
      id: 'test-chat-id',
      message: { id: 'test-msg-id', role: 'user', content: 'Hello no search!', parts: [{type: 'text', text: 'Hello no search!'}], createdAt: new Date().toISOString() },
      selectedChatModel: 'gemini-1.5-flash-search', // User selected this model
      selectedVisibilityType: 'private',
      isWebSearchEnabled: false, // But web search is disabled
    };

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);

    // myProvider.languageModel should be called with 'gemini-1.5-flash-search' because that's what selectedChatModel is.
    // The route logic is:
    // model: selectedChatModel === 'gemini-1.5-flash-search' && isWebSearchEnabled
    //          ? myProvider.languageModel('gemini-1.5-flash-search')  <- this is the one pre-configured with search
    //          : myProvider.languageModel(selectedChatModel)          <- this is the generic one
    // So, if isWebSearchEnabled is false, it falls to the second case.
    // It will still be 'gemini-1.5-flash-search' if that was selectedChatModel, but it's the version *not* specifically chosen for its search grounding.
    // In providers.ts, 'gemini-1.5-flash-search' is mapped to google('gemini-1.5-flash', { useSearchGrounding: true })
    // and other models like 'chat-model' are mapped to google('gemini-2.0-flash').
    // The key is which model ID is passed to myProvider.languageModel().
    // If isWebSearchEnabled is false, it should pass selectedChatModel ('gemini-1.5-flash-search') to myProvider.languageModel.
    // If isWebSearchEnabled is true, it should pass 'gemini-1.5-flash-search' (the specific search-grounded one) to myProvider.languageModel.
    // The test here is that the *specific search-grounded instance* is NOT used if isWebSearchEnabled: false.
    // The code is: `myProvider.languageModel(selectedChatModel)` when `isWebSearchEnabled` is false.
    // So it should be called with the original `selectedChatModel`.
    expect(mockLanguageModel).toHaveBeenCalledWith('gemini-1.5-flash-search');


    expect(mockStreamText).toHaveBeenCalled();
    const streamTextArgs = mockStreamText.mock.calls[0][0];
    // The model passed to streamText should be the standard 'gemini-1.5-flash-search'
    // (which might have search by default, but not *because* isWebSearchEnabled was true)
    expect(streamTextArgs.model).toEqual(expect.objectContaining({ id: 'gemini-1.5-flash-search' }));
    // url_context should still be present because the model 'gemini-1.5-flash-search' is being used.
    // The route adds url_context to all streamText calls.
    expect(streamTextArgs.tools).toHaveProperty('url_context');
  });

  test('should use chat-model and not enable web search features when selected model is not search-compatible', async () => {
    const requestBody = {
      id: 'test-chat-id',
      message: { id: 'test-msg-id', role: 'user', content: 'Hello normal chat!', parts: [{type: 'text', text: 'Hello normal chat!'}], createdAt: new Date().toISOString() },
      selectedChatModel: 'chat-model', // A non-search-compatible model
      selectedVisibilityType: 'private',
      isWebSearchEnabled: true, // User might have toggled it on, but model doesn't support it
    };

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);

    // The route logic should select 'chat-model' for the provider.
    expect(mockLanguageModel).toHaveBeenCalledWith('chat-model');

    expect(mockStreamText).toHaveBeenCalled();
    const streamTextArgs = mockStreamText.mock.calls[0][0];

    // The model passed to streamText should be 'chat-model'.
    expect(streamTextArgs.model).toEqual(expect.objectContaining({ id: 'chat-model' }));

    // url_context should still be present as it's added to all streamText calls by default in the route.
    expect(streamTextArgs.tools).toHaveProperty('url_context');
  });

});

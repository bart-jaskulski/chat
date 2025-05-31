import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageEditor, type MessageEditorProps } from './message-editor'; // Adjust path
import type { Message } from 'ai';

// Mock UseChatHelpers parts
const mockUseChatHelpers = {
  setMessages: jest.fn(),
  reload: jest.fn(),
};

// Mock a sample message
const sampleMessage: Message = {
  id: 'test-msg-id',
  role: 'user',
  content: 'Hello world',
  createdAt: new Date(),
};

describe('MessageEditor', () => {
  const mockSetMode = jest.fn();
  const mockSetIsWebSearchEnabled = jest.fn();

  const defaultEditorProps: MessageEditorProps = {
    message: sampleMessage,
    setMode: mockSetMode,
    ...mockUseChatHelpers,
    // Props for web search toggle
    selectedChatModelId: 'chat-model', // Default to a non-search model
    isWebSearchEnabled: false,
    setIsWebSearchEnabled: mockSetIsWebSearchEnabled,
  };

  beforeEach(() => {
    mockSetIsWebSearchEnabled.mockClear();
    mockSetMode.mockClear();
    mockUseChatHelpers.reload.mockClear();
    mockUseChatHelpers.setMessages.mockClear();
  });

  test('web search toggle button should be visible for search-compatible model', () => {
    render(
      <MessageEditor
        {...defaultEditorProps}
        selectedChatModelId="gemini-1.5-flash-search"
      />,
    );
    expect(screen.getByTitle('Toggle Web Search')).toBeVisible();
  });

  test('web search toggle button should not be visible for non-search model', () => {
    render(
      <MessageEditor
        {...defaultEditorProps}
        selectedChatModelId="chat-model"
      />,
    );
    expect(screen.queryByTitle('Toggle Web Search')).not.toBeInTheDocument();
  });

  test('clicking web search toggle should call setIsWebSearchEnabled with the new state', () => {
    render(
      <MessageEditor
        {...defaultEditorProps}
        selectedChatModelId="gemini-1.5-flash-search"
        isWebSearchEnabled={false} // Initial state
      />,
    );

    const toggleButton = screen.getByTitle('Toggle Web Search');
    fireEvent.click(toggleButton);

    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledTimes(1);
    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledWith(true);

    // Simulate re-render with new prop and click again
    render(
      <MessageEditor
        {...defaultEditorProps}
        selectedChatModelId="gemini-1.5-flash-search"
        isWebSearchEnabled={true} // New initial state
      />,
    );
    const updatedToggleButton = screen.getByTitle('Toggle Web Search');
    fireEvent.click(updatedToggleButton);
    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledTimes(2); // Called once more
    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledWith(false);
  });

  // Test to ensure the Send button still works and calls reload
  test('Send button should call reload', async () => {
    render(<MessageEditor {...defaultEditorProps} />);
    const sendButton = screen.getByTestId('message-editor-send-button');
    fireEvent.click(sendButton);

    // Check if deleteTrailingMessages (mocked if it's an action) and reload are called
    // For now, just checking reload as deleteTrailingMessages is an external action
    // await waitFor(() => expect(mockUseChatHelpers.reload).toHaveBeenCalled()); // if there are async operations before reload
    expect(mockUseChatHelpers.reload).toHaveBeenCalled();
    expect(mockSetMode).toHaveBeenCalledWith('view');
  });
});

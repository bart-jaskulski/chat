import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MultimodalInput } from './multimodal-input'; // Adjust path as necessary
import { SearchIcon } from './icons'; // Assuming SearchIcon is also used here or for mocking

// Minimal mock for UseChatHelpers parts if not all are needed for these specific tests
const mockUseChatHelpers = {
  input: '',
  setInput: jest.fn(),
  status: 'ready' as const, // 'ready' is a common default
  stop: jest.fn(),
  append: jest.fn(),
  handleSubmit: jest.fn(),
  setMessages: jest.fn(),
  messages: [],
};

// Mock attachments state
const mockAttachments: any[] = [];
const mockSetAttachments = jest.fn();

describe('MultimodalInput', () => {
  const mockSetIsWebSearchEnabled = jest.fn();

  // Default props to pass to MultimodalInput, can be overridden in tests
  const defaultProps = {
    chatId: 'test-chat-id',
    ...mockUseChatHelpers,
    attachments: mockAttachments,
    setAttachments: mockSetAttachments,
    selectedVisibilityType: 'private' as const,
    // Props for web search toggle
    selectedChatModelId: 'chat-model', // Default to a non-search model
    isWebSearchEnabled: false,
    setIsWebSearchEnabled: mockSetIsWebSearchEnabled,
  };

  beforeEach(() => {
    // Clear mock call counts before each test
    mockSetIsWebSearchEnabled.mockClear();
    defaultProps.setInput.mockClear(); // Clear any other relevant mocks
  });

  test('web search toggle button should be visible for search-compatible model', () => {
    render(
      <MultimodalInput
        {...defaultProps}
        selectedChatModelId="gemini-1.5-flash-search"
      />,
    );
    // The button has title "Toggle Web Search" and contains SearchIcon
    // A more robust way could be to add a data-testid to the button itself.
    // For now, assuming the title is unique enough or icon is present.
    expect(screen.getByTitle('Toggle Web Search')).toBeVisible();
  });

  test('web search toggle button should not be visible for non-search model', () => {
    render(<MultimodalInput {...defaultProps} selectedChatModelId="chat-model" />);
    expect(screen.queryByTitle('Toggle Web Search')).not.toBeInTheDocument();
  });

  test('clicking web search toggle should call setIsWebSearchEnabled with the new state', () => {
    render(
      <MultimodalInput
        {...defaultProps}
        selectedChatModelId="gemini-1.5-flash-search"
        isWebSearchEnabled={false} // Initial state is false
      />,
    );

    const toggleButton = screen.getByTitle('Toggle Web Search');
    fireEvent.click(toggleButton);

    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledTimes(1);
    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledWith(true); // Toggled to true

    // Simulate re-render with new prop and click again
    render(
      <MultimodalInput
        {...defaultProps}
        selectedChatModelId="gemini-1.5-flash-search"
        isWebSearchEnabled={true} // Initial state is true for this render
      />,
    );
    const updatedToggleButton = screen.getByTitle('Toggle Web Search');
    fireEvent.click(updatedToggleButton);
    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledTimes(2); // Called once more
    expect(mockSetIsWebSearchEnabled).toHaveBeenCalledWith(false); // Toggled to false
  });
});

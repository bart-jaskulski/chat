import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelSelector } from './model-selector'; // Adjust path as necessary
import { chatModels as allChatModels } from '@/lib/ai/models'; // Original models
import type { Session } from 'next-auth';

// Mock chatModels and entitlements to control what's available in tests
jest.mock('@/lib/ai/models', () => ({
  chatModels: [
    { id: 'chat-model', name: 'Chat Model', description: 'Standard chat model' },
    {
      id: 'gemini-1.5-flash-search',
      name: 'Gemini 1.5 Flash (Web Search)',
      description: 'With web search',
    },
    { id: 'another-model', name: 'Another Model', description: 'Another one' },
  ],
}));

jest.mock('@/lib/ai/entitlements', () => ({
  entitlementsByUserType: {
    free: {
      maxMessagesPerDay: 10,
      availableChatModelIds: [
        'chat-model',
        'gemini-1.5-flash-search',
        'another-model',
      ],
      availableVisibilityTypes: ['private'],
    },
    // Add other user types if needed for different test scenarios
  },
}));

// Mock next-auth session
const mockSession: Session = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    type: 'free', // User type that has access to the search model
    image: null,
  },
  expires: 'never',
};

describe('ModelSelector', () => {
  beforeEach(() => {
    // Reset any runtime mocks or state if necessary
  });

  test('Search icon should be visible for search-compatible model in dropdown', () => {
    render(
      <ModelSelector session={mockSession} selectedModelId="chat-model" />,
    );

    // Click the dropdown trigger button to open the menu
    const triggerButton = screen.getByTestId('model-selector');
    fireEvent.click(triggerButton);

    // Find the menu item for the search-compatible model
    // The item's text might be just "Gemini 1.5 Flash (Web Search)"
    // The icon is a child of the button inside DropdownMenuItem
    const searchModelItem = screen.getByTestId(
      'model-selector-item-gemini-1.5-flash-search',
    );

    // Check within this item for the SearchIcon's title or class if more specific selector is needed
    // The icon has title "Web search enabled"
    const searchIcon = within(searchModelItem).getByTitle('Web search enabled');
    expect(searchIcon).toBeVisible();
  });

  test('Search icon should not be visible for non-search models in dropdown', () => {
    render(
      <ModelSelector session={mockSession} selectedModelId="chat-model" />,
    );

    const triggerButton = screen.getByTestId('model-selector');
    fireEvent.click(triggerButton);

    const standardModelItem = screen.getByTestId(
      'model-selector-item-chat-model',
    );
    expect(
      within(standardModelItem).queryByTitle('Web search enabled'),
    ).not.toBeInTheDocument();

    const anotherModelItem = screen.getByTestId(
      'model-selector-item-another-model',
    );
    expect(
      within(anotherModelItem).queryByTitle('Web search enabled'),
    ).not.toBeInTheDocument();
  });
});

// Helper to query within a specific element, useful for scoped assertions
import { queries } from '@testing-library/dom';
function within(element: HTMLElement) {
  return queries.getQueriesForElement(element);
}

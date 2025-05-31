'use client';

import { Message } from 'ai';
import { Button } from './ui/button';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Textarea } from './ui/textarea';
import { SearchIcon } from 'lucide-react'; // Import SearchIcon
import { cn } from '@/lib/utils'; // Import cn for conditional class names
import { deleteTrailingMessages } from '@/app/(chat)/actions';
import { UseChatHelpers } from '@ai-sdk/react';

export type MessageEditorProps = {
  message: Message;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  selectedChatModelId: string; // Added selectedChatModelId
  isWebSearchEnabled: boolean; // Added isWebSearchEnabled
  setIsWebSearchEnabled: Dispatch<SetStateAction<boolean>>; // Added setIsWebSearchEnabled
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload,
  selectedChatModelId, // Destructure new prop
  isWebSearchEnabled, // Destructure new prop
  setIsWebSearchEnabled, // Destructure new prop
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [draftContent, setDraftContent] = useState<string>(message.content);
  const isSearchCompatibleModel =
    selectedChatModelId === 'gemini-1.5-flash-search'; // Determine if model is search compatible
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        data-testid="message-editor"
        ref={textareaRef}
        className="bg-transparent outline-hidden overflow-hidden resize-none text-base! rounded-xl w-full"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row gap-2 justify-end items-center"> {/* Added items-center */}
        {isSearchCompatibleModel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
            className={cn(
              'h-fit py-2 px-3 rounded-full', // Added rounded-full for better icon button look
              isWebSearchEnabled ? 'bg-accent text-accent-foreground' : '',
            )}
            title="Toggle Web Search"
          >
            <SearchIcon className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="outline"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode('view');
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          className="h-fit py-2 px-3"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);

            await deleteTrailingMessages({
              id: message.id,
            });

            // @ts-expect-error todo: support UIMessage in setMessages
            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                const updatedMessage = {
                  ...message,
                  content: draftContent,
                  parts: [{ type: 'text', text: draftContent }],
                };

                return [...messages.slice(0, index), updatedMessage];
              }

              return messages;
            });

            setMode('view');
            reload();
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}

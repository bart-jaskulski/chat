'use client';

import { startTransition, useMemo, useOptimistic, useState, useEffect } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { chatModels, ChatModel } from '@/lib/ai/models';
import { Persona } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon, SettingsIcon } from './icons'; // Assuming SettingsIcon exists or can be added
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { Session } from 'next-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PersonaManagementView } from './persona-management-view';

const PERSONA_ID_PREFIX = 'persona_';

export function ModelSelector({
  session,
  selectedModelId, // This could be a modelId or a prefixed personaId
  className,
}: {
  session: Session;
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [managePersonasOpen, setManagePersonasOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);
  const [userPersonas, setUserPersonas] = useState<Persona[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);

  const userType = session.user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id),
  );

  useEffect(() => {
    async function fetchPersonas() {
      if (!session?.user?.id) return;
      setIsLoadingPersonas(true);
      try {
        const response = await fetch('/api/personas');
        if (!response.ok) {
          throw new Error('Failed to fetch personas');
        }
        const data: Persona[] = await response.json();
        setUserPersonas(data);
      } catch (error) {
        console.error('Error fetching personas:', error);
        // Optionally set an error state to display to the user
      } finally {
        setIsLoadingPersonas(false);
      }
    }
    fetchPersonas();
  }, [session?.user?.id, managePersonasOpen]); // Refetch when dialog closes

  const selectedItemName = useMemo(() => {
    if (optimisticModelId.startsWith(PERSONA_ID_PREFIX)) {
      const personaId = optimisticModelId.substring(PERSONA_ID_PREFIX.length);
      const persona = userPersonas.find((p) => p.id === personaId);
      return persona ? `${persona.name} (Persona)` : 'Select Persona';
    }
    const model = availableChatModels.find((m) => m.id === optimisticModelId);
    return model ? model.name : 'Select Model';
  }, [optimisticModelId, availableChatModels, userPersonas]);

  const handleSelect = (id: string, isPersona: boolean) => {
    setOpen(false);
    const valueToSave = isPersona ? `${PERSONA_ID_PREFIX}${id}` : id;
    startTransition(() => {
      setOptimisticModelId(valueToSave);
      saveChatModelAsCookie(valueToSave);
    });
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild
          className={cn(
            'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
            className,
          )}
        >
          <Button
            data-testid="model-selector"
            variant="outline"
            className="md:px-2 md:h-[34px]"
          >
            {selectedItemName}
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[300px]">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Standard Models</DropdownMenuLabel>
            {availableChatModels.map((chatModel) => (
              <DropdownMenuItem
                data-testid={`model-selector-item-${chatModel.id}`}
                key={chatModel.id}
                onSelect={() => handleSelect(chatModel.id, false)}
                data-active={chatModel.id === optimisticModelId}
                asChild
              >
                <button
                  type="button"
                  className="gap-4 group/item flex flex-row justify-between items-center w-full"
                >
                  <div className="flex flex-col gap-1 items-start">
                    <div>{chatModel.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {chatModel.description}
                    </div>
                  </div>
                  <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                    <CheckCircleFillIcon />
                  </div>
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Your Personas</DropdownMenuLabel>
            {isLoadingPersonas && <DropdownMenuItem disabled>Loading personas...</DropdownMenuItem>}
            {!isLoadingPersonas && userPersonas.length === 0 && (
              <DropdownMenuItem disabled>No personas created yet.</DropdownMenuItem>
            )}
            {userPersonas.map((persona) => (
              <DropdownMenuItem
                data-testid={`model-selector-item-persona-${persona.id}`}
                key={persona.id}
                onSelect={() => handleSelect(persona.id, true)}
                data-active={`${PERSONA_ID_PREFIX}${persona.id}` === optimisticModelId}
                asChild
              >
                <button
                  type="button"
                  className="gap-4 group/item flex flex-row justify-between items-center w-full"
                >
                  <div className="flex flex-col gap-1 items-start">
                    <div>{persona.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {persona.systemPrompt}
                    </div>
                  </div>
                  <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                    <CheckCircleFillIcon />
                  </div>
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <Dialog open={managePersonasOpen} onOpenChange={setManagePersonasOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem
                data-testid="manage-personas-button"
                onSelect={(e) => e.preventDefault()} // Prevent DropdownMenu from closing
                className="group/item flex flex-row items-center w-full"
              >
                <SettingsIcon className="mr-2 h-4 w-4" /> {/* Assuming SettingsIcon is available */}
                Manage Personas
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Manage Personas</DialogTitle>
              </DialogHeader>
              <PersonaManagementView />
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

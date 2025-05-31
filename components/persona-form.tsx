'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Persona } from '@/lib/types';
import { chatModels, ChatModel } from '@/lib/ai/models'; // Fetched from lib/ai/models.ts

interface PersonaFormProps {
  persona?: Persona;
  onSave?: () => void; // Callback after saving
  onCancel?: () => void; // Callback for cancelling
}

export function PersonaForm({ persona, onSave, onCancel }: PersonaFormProps) {
  const router = useRouter();
  const [name, setName] = useState(persona?.name || '');
  const [systemPrompt, setSystemPrompt] = useState(persona?.systemPrompt || '');
  const [modelId, setModelId] = useState(persona?.modelId || chatModels[0]?.id || '');
  const [temperature, setTemperature] = useState<number | string>(persona?.temperature ?? '');
  const [topP, setTopP] = useState<number | string>(persona?.topP ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!persona;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      name,
      systemPrompt,
      modelId,
      temperature: temperature === '' ? undefined : Number(temperature),
      topP: topP === '' ? undefined : Number(topP),
    };

    try {
      const response = await fetch(
        isEditMode ? `/api/personas/${persona.id}` : '/api/personas',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} persona`);
      }

      // TODO: Implement toast notifications for success
      console.log(`Persona ${isEditMode ? 'updated' : 'created'} successfully!`);

      if (onSave) {
        onSave();
      } else {
        router.refresh(); // Or redirect, depending on UX
      }

    } catch (err: any) {
      setError(err.message);
      // TODO: Implement toast notifications for error
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required
          rows={5}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="modelId">Base Model</Label>
        <Select
          value={modelId}
          onValueChange={setModelId}
          required
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {chatModels.map((model: ChatModel) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name} - {model.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="temperature">Temperature (Optional)</Label>
        <Input
          id="temperature"
          type="number"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          step="0.1"
          min="0"
          max="2"
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="topP">Top P (Optional)</Label>
        <Input
          id="topP"
          type="number"
          value={topP}
          onChange={(e) => setTopP(e.target.value)}
          step="0.01"
          min="0"
          max="1"
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Persona' : 'Create Persona')}
        </Button>
      </div>
    </form>
  );
}

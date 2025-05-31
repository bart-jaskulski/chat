'use client';

import { useEffect, useState, useCallback } from 'react';
import { Persona } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PersonaForm } from './persona-form';
import { PersonaListItem } from './persona-list-item';
// Assuming a Dialog or Modal component might be used to host this view or the form.
// For now, it will render inline.
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function PersonaManagementView() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | undefined>(undefined);

  const fetchPersonas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/personas');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch personas');
      }
      const data: Persona[] = await response.json();
      setPersonas(data);
    } catch (err: any) {
      setError(err.message);
      // TODO: Show toast error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const handleCreateNew = () => {
    setEditingPersona(undefined);
    setShowForm(true);
  };

  const handleEdit = (persona: Persona) => {
    setEditingPersona(persona);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingPersona(undefined);
    fetchPersonas(); // Refresh the list
    // TODO: Show toast success
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPersona(undefined);
  };

  const handleDelete = async (personaId: string) => {
    // Confirmation is handled within PersonaListItem, but error/loading state for the list is here
    setIsLoading(true); // Visually indicate something is happening on the list
    try {
      const response = await fetch(`/api/personas/${personaId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete persona');
      }
      fetchPersonas(); // Refresh list
      // TODO: Show toast success for delete
    } catch (err: any) {
      setError(err.message); // Show error related to delete if it wasn't caught by list item
      // TODO: Show toast error for delete
      setIsLoading(false); // Reset loading if delete failed at this level
    }
    // setIsLoading(false) will be called by fetchPersonas on success
  };

  if (isLoading && personas.length === 0) {
    return <p>Loading personas...</p>;
  }

  if (error && personas.length === 0) {
    return <p className="text-red-500">Error: {error}. <Button onClick={fetchPersonas}>Retry</Button></p>;
  }

  if (showForm) {
    return (
      <PersonaForm
        persona={editingPersona}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Manage Personas</h2>
        <Button onClick={handleCreateNew}>Create New Persona</Button>
      </div>

      {error && <p className="text-red-500">Error: {error}. Personas list might be stale.</p>}

      {personas.length === 0 && !isLoading && (
        <p>No personas created yet. Click "Create New Persona" to get started.</p>
      )}

      {personas.length > 0 && (
        <div className="border rounded-md">
          {personas.map((p) => (
            <PersonaListItem
              key={p.id}
              persona={p}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
       {isLoading && personas.length > 0 && <p>Refreshing personas...</p>}
    </div>
  );
}

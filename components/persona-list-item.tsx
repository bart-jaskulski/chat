'use client';

import { useState } from 'react';
import { Persona } from '@/lib/types';
import { Button } from '@/components/ui/button';
// Assuming a Dialog component exists for confirmation, or use window.confirm for now
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface PersonaListItemProps {
  persona: Persona;
  onEdit: (persona: Persona) => void;
  onDelete: (personaId: string) => Promise<void>; // Make it async to handle API call
}

export function PersonaListItem({ persona, onEdit, onDelete }: PersonaListItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(persona.id);
      // Optionally, trigger a success toast here
    } catch (err: any) {
      setError(err.message || 'Failed to delete persona');
      // Optionally, trigger an error toast here
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 border-b">
      <span className="font-medium">{persona.name}</span>
      <div className="space-x-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(persona)}>
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirmDialog(true)}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      {/* Basic confirmation dialog using window.confirm, can be replaced with a proper Dialog component */}
      {showConfirmDialog && (
        <div
          // Poor man's modal - replace with proper Dialog component
          style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'white', padding: '20px', border: '1px solid #ccc', zIndex: 100
          }}
        >
          <p>Are you sure you want to delete the persona "{persona.name}"?</p>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

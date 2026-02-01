import { useState, useEffect, useCallback } from 'react';
import type { OrderNote } from '@dear-margeaux/api';

interface OrderNotesProps {
  orderId: string;
  adminId: string;
  adminName: string;
}

export default function OrderNotes({
  orderId,
  adminId,
  adminName,
}: OrderNotesProps) {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/notes`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      const data = await response.json();
      setNotes(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNoteContent.trim(),
          admin_id: adminId,
          admin_name: adminName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add note');
      }

      const newNote = await response.json();
      setNotes((prev) => [newNote, ...prev]);
      setNewNoteContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          admin_id: adminId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update note');
      }

      const updatedNote = await response.json();
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updatedNote : n)));
      setEditingNoteId(null);
      setEditContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orders/${orderId}/notes/${noteId}?admin_id=${encodeURIComponent(adminId)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete note');
      }

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (note: OrderNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="space-y-3">
        <div>
          <label htmlFor="new-note" className="sr-only">
            Add a note
          </label>
          <textarea
            id="new-note"
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background-primary)] py-2 px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newNoteContent.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-700)] rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Adding...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add Note
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-[var(--color-status-error)]/10 text-[var(--color-status-error)] text-sm">
          {error}
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-6 text-sm text-[var(--color-text-muted)]">
          No notes yet. Add the first note above.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-tertiary)]/30"
            >
              {editingNoteId === note.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background-primary)] py-2 px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditNote(note.id)}
                      disabled={isSubmitting || !editContent.trim()}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-700)] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="text-sm">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {note.admin_name}
                      </span>
                      <span className="text-[var(--color-text-muted)] ml-2">
                        {formatDate(note.created_at)}
                        {note.updated_at !== note.created_at && ' (edited)'}
                      </span>
                    </div>
                    {note.admin_id === adminId && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(note)}
                          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          aria-label="Edit note"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4"
                          >
                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] transition-colors"
                          aria-label="Delete note"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
                    {note.content}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

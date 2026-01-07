import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "kavia_notes_v1";

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} text
 * @property {number} createdAt
 * @property {number} updatedAt
 */

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function makeId() {
  // Good enough for frontend-only notes (no security requirement).
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeLoadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // minimal validation
    return parsed
      .filter((n) => n && typeof n.id === "string" && typeof n.text === "string")
      .map((n) => ({
        id: n.id,
        text: n.text,
        createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

function safeSaveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // If storage is full/blocked, app still works in memory.
  }
}

// PUBLIC_INTERFACE
function App() {
  /** @type {[Note[], Function]} */
  const [notes, setNotes] = useState(() => safeLoadNotes());
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState("");

  const draftRef = useRef(null);
  const editRef = useRef(null);

  // Persist notes
  useEffect(() => {
    safeSaveNotes(notes);
  }, [notes]);

  // Focus management: when switching to edit mode, focus editor
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
    }
  }, [editingId]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return list;
    return list.filter((n) => n.text.toLowerCase().includes(q));
  }, [notes, search]);

  // PUBLIC_INTERFACE
  function addNote() {
    const text = draft.trim();
    if (!text) {
      draftRef.current?.focus();
      return;
    }

    const now = Date.now();
    const newNote = {
      id: makeId(),
      text,
      createdAt: now,
      updatedAt: now,
    };

    setNotes((prev) => [newNote, ...prev]);
    setDraft("");
    draftRef.current?.focus();
  }

  // PUBLIC_INTERFACE
  function startEdit(note) {
    setEditingId(note.id);
    setEditingDraft(note.text);
  }

  // PUBLIC_INTERFACE
  function cancelEdit() {
    setEditingId(null);
    setEditingDraft("");
  }

  // PUBLIC_INTERFACE
  function saveEdit() {
    const text = editingDraft.trim();
    if (!editingId) return;

    if (!text) {
      // If user clears the note, treat as delete to keep UI simple.
      setNotes((prev) => prev.filter((n) => n.id !== editingId));
      cancelEdit();
      return;
    }

    setNotes((prev) =>
      prev.map((n) =>
        n.id === editingId ? { ...n, text, updatedAt: Date.now() } : n
      )
    );
    cancelEdit();
  }

  // PUBLIC_INTERFACE
  function deleteNote(id) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingId === id) cancelEdit();
  }

  // PUBLIC_INTERFACE
  function clearAll() {
    setNotes([]);
    cancelEdit();
    setDraft("");
    setSearch("");
    draftRef.current?.focus();
  }

  function onComposerKeyDown(e) {
    // Ctrl/Cmd + Enter to add quickly
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      addNote();
    }
  }

  function onEditorKeyDown(e) {
    // Esc cancels edit, Ctrl/Cmd + Enter saves
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    }
  }

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <div className="brand">
            <h1 className="title">Notes</h1>
            <p className="subtitle">
              A simple, frontend-only notes app. Notes are saved locally in your
              browser.
            </p>
          </div>

          <div className="headerActions" aria-label="Notes controls">
            <span className="counter" aria-live="polite">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
            <button
              className="btn btnDanger btnSmall"
              type="button"
              onClick={clearAll}
              disabled={notes.length === 0}
            >
              Clear all
            </button>
          </div>
        </header>

        <section className="card composer" aria-label="Add a note">
          <label className="fieldLabel" htmlFor="new-note">
            New note
          </label>
          <textarea
            id="new-note"
            ref={draftRef}
            className="textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Write something… (Ctrl/⌘ + Enter to add)"
          />
          <div className="composerFooter">
            <div className="hint">
              Tip: Use <strong>Ctrl/⌘ + Enter</strong> to add quickly.
            </div>
            <div className="btnRow">
              <button
                className="btn btnGhost"
                type="button"
                onClick={() => setDraft("")}
                disabled={draft.length === 0}
              >
                Clear
              </button>
              <button className="btn btnPrimary" type="button" onClick={addNote}>
                Add note
              </button>
            </div>
          </div>
        </section>

        <section className="card list" aria-label="Notes list">
          <div className="listHeader">
            <label className="fieldLabel" htmlFor="search-notes">
              Search
            </label>
          </div>

          <div className="listHeader" style={{ paddingTop: 0 }}>
            <input
              id="search-notes"
              className="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              aria-label="Search notes"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <div className="emptyState">
              <p className="emptyTitle">
                {notes.length === 0 ? "No notes yet." : "No matches found."}
              </p>
              <p className="emptyDesc">
                {notes.length === 0
                  ? "Add your first note above."
                  : "Try a different search query."}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isEditing = editingId === note.id;

              return (
                <article key={note.id} className="note">
                  {isEditing ? (
                    <div className="inlineEditor" aria-label="Edit note">
                      <div className="inlineEditorHeader">
                        <p className="inlineEditorTitle">Editing</p>
                        <div className="noteActions">
                          <button
                            className="btn btnGhost btnSmall"
                            type="button"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btnPrimary btnSmall"
                            type="button"
                            onClick={saveEdit}
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <label className="fieldLabel" htmlFor={`edit-${note.id}`}>
                        Note text
                      </label>
                      <textarea
                        id={`edit-${note.id}`}
                        ref={editRef}
                        className="textarea"
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        onKeyDown={onEditorKeyDown}
                        placeholder="Edit note… (Esc to cancel, Ctrl/⌘ + Enter to save)"
                      />

                      <div className="composerFooter">
                        <div className="hint">
                          <strong>Esc</strong> cancels, <strong>Ctrl/⌘ + Enter</strong>{" "}
                          saves. Clearing the text will delete the note on save.
                        </div>
                        <div className="btnRow">
                          <button
                            className="btn btnDanger btnSmall"
                            type="button"
                            onClick={() => deleteNote(note.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="noteTop">
                        <div className="noteMeta">
                          <div className="noteDate">
                            Updated {formatDate(note.updatedAt)}
                          </div>
                        </div>
                        <div className="noteActions">
                          <button
                            className="btn btnGhost btnSmall"
                            type="button"
                            onClick={() => startEdit(note)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btnDanger btnSmall"
                            type="button"
                            onClick={() => deleteNote(note.id)}
                            aria-label="Delete note"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p className="noteText">{note.text}</p>
                    </>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

export default App;

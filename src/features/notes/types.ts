export type NoteColor =
    | 'gray'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'purple';

export interface Note {
    id: string;
    title: string;
    contentHtml: string;
    color: NoteColor;
    updatedAt: string; // ISO string
    isPreserved?: boolean;
}

export interface NotesCollection {
    notes: Note[];
}

export interface NotesStorageAdapter {
    login(): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    list(): Promise<Note[]>;
    save(notes: Note[]): Promise<void>;
    getUserIdentifier(): Promise<string | null>;
}

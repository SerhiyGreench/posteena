export type KnowledgeColor =
    | 'gray'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'purple';

export interface KnowledgeArticle {
    id: string;
    chapterId: string | null;
    title: string;
    content: string; // Markdown
    color?: KnowledgeColor;
    createdAt: string; // ISO string
    createdBy: string;
    updatedAt: string; // ISO string
    updatedBy: string;
    order: number;
}

export interface KnowledgeChapter {
    id: string;
    parentId: string | null; // null for root chapters
    title: string;
    order: number;
}

export interface Knowledge {
    chapters: KnowledgeChapter[];
    articles: KnowledgeArticle[];
}

export interface KnowledgeStorageAdapter {
    init(): Promise<void>;
    login(): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getUserIdentifier(): Promise<string | null>;

    // Core data operations
    fetchKnowledge(): Promise<Knowledge>;
    saveKnowledge(knowledge: Knowledge): Promise<void>;

    // For markdown file storage, we might want to save articles individually or as a whole.
    // Given the requirement to store as .md files in Google Drive,
    // the adapter will handle the mapping between the tree structure and files.
}

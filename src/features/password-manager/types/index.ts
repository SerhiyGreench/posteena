export interface PasswordItem {
    id: string;
    name: string;
    email: string;
    username: string;
    password: string;
}

export interface PasswordGroup {
    id: string;
    name: string;
    items: PasswordItem[];
    encryptedContent?: string;
}

export interface GroupMetadata {
    id: string;
    name: string;
    fileId: string;
    modifiedTime?: string;
    lastModifyingUser?: string;
}

export interface StorageAdapter {
    login(): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getGroups(): Promise<GroupMetadata[]>;
    createGroup(name: string): Promise<GroupMetadata>;
    saveGroup(group: PasswordGroup): Promise<void>;
    loadGroup(fileId: string): Promise<PasswordGroup | string>;
    deleteGroup(fileId: string): Promise<void>;
    getUserIdentifier(): Promise<string | null>;
}

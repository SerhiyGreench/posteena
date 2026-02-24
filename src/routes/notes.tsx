import { createFileRoute } from '@tanstack/react-router';
import { Routes } from '@/constants/Routes';
import NotesManager from '@/features/notes/components/NotesManager';

export const Route = createFileRoute(Routes.Notes)({
    component: NotesManager,
});

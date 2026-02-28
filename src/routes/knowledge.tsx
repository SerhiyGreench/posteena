import { createFileRoute } from '@tanstack/react-router';
import KnowledgeManager from '@/features/knowledge/components/KnowledgeManager';

export const Route = createFileRoute('/knowledge')({
    component: KnowledgeManager,
});

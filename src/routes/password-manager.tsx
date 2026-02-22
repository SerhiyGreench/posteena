import { createFileRoute } from '@tanstack/react-router';
import PasswordManager from '@/features/password-manager/components/PasswordManager';

export const Route = createFileRoute('/password-manager')({
    component: PasswordManager,
});

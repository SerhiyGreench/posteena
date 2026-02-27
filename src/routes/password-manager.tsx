import { createFileRoute } from '@tanstack/react-router';
import Passwords from '@/features/passwords/components/Passwords';

export const Route = createFileRoute('/password-manager')({
    component: Passwords,
});

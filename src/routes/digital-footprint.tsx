import { createFileRoute } from '@tanstack/react-router';
import { Routes } from '@/constants/Routes';
import DigitalFootprint from '@/features/digital-footprint/components/DigitalFootprint';

export const Route = createFileRoute(Routes.DigitalFootprint)({
    component: DigitalFootprint,
});

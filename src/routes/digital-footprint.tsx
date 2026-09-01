import { createFileRoute } from '@tanstack/react-router';

import DigitalFootprint from '@/features/digital-footprint/components/DigitalFootprint';

// The route id must be a string literal: the TanStack router plugin parses
// this file statically and cannot resolve a constant. Use `Routes` for
// navigation (`Link to=`), which stays type-checked against this tree.
export const Route = createFileRoute('/digital-footprint')({
    component: DigitalFootprint,
});

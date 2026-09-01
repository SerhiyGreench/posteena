import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from 'ui/badge';

import {
    type InvoiceStatusType,
    InvoiceStatuses,
} from '@/features/invoices/constants/InvoiceStatuses';

export interface InvoiceStatusBadgeProps {
    status: InvoiceStatusType;
}

/** Badge variant per lifecycle state. */
function resolveVariant(
    status: InvoiceStatusType,
): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === InvoiceStatuses.Paid) {
        return 'default';
    }

    if (status === InvoiceStatuses.Issued) {
        return 'secondary';
    }

    if (status === InvoiceStatuses.Cancelled) {
        return 'destructive';
    }

    return 'outline';
}

/**
 * The invoice status, shown identically in the table and on the mobile card.
 */
export default function InvoiceStatusBadge({
    status,
}: InvoiceStatusBadgeProps): ReactElement {
    const { t } = useTranslation();

    return (
        <Badge variant={resolveVariant(status)}>
            {t(`invoices.status.${status}`)}
        </Badge>
    );
}

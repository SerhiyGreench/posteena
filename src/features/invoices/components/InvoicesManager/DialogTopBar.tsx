import { XIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { DialogClose, DialogHeader, DialogTitle } from 'ui/dialog';

export interface DialogTopBarProps {
    children: ReactNode;
}

/**
 * Title row that stays put while the dialog scrolls.
 *
 * The invoice dialogs are taller than a phone screen, and the close button the
 * dialog draws in its own corner scrolls away with the content — leaving no
 * visible way out halfway down a long form. Pinning the row keeps the title
 * and the close button reachable from anywhere in the dialog.
 *
 * Pair it with `showCloseButton={false}` on the `DialogContent`, or the dialog
 * draws a second, scrolling close button behind this one.
 */
export default function DialogTopBar({
    children,
}: DialogTopBarProps): ReactElement {
    const { t } = useTranslation();

    return (
        <DialogHeader className="bg-background sticky -top-4 z-10 -mx-4 -mt-4 flex-row items-center justify-between gap-4 border-b px-4 py-3">
            <DialogTitle>{children}</DialogTitle>
            <DialogClose
                render={<Button variant="ghost" size="icon-sm" />}
                aria-label={t('invoices.actions.close')}
            >
                <XIcon />
            </DialogClose>
        </DialogHeader>
    );
}

/**
 * How an invoice is put into an e-mail.
 *
 * - `Attachment` — creates a real Gmail draft with the PDF attached, and can
 *   set the sender to a verified alias. Needs the `gmail.compose` permission,
 *   requested the first time it is used.
 * - `Link` — opens Gmail's compose window with a link to the PDF in Drive.
 *   Needs no extra permission, but a compose URL can carry neither an
 *   attachment nor a sender.
 */
export const EmailDeliveryModes = {
    Attachment: 'attachment',
    Link: 'link',
} as const;

export type EmailDeliveryModeType =
    (typeof EmailDeliveryModes)[keyof typeof EmailDeliveryModes];

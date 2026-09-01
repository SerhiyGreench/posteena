import { Loader2 } from 'lucide-react';
import {
    type ComponentProps,
    type ReactElement,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Button } from 'ui/button';

export interface AsyncButtonProps extends Omit<
    ComponentProps<typeof Button>,
    'onClick'
> {
    onClick: () => void | Promise<void>;
    /** Replace the label with the spinner instead of showing both. */
    spinnerOnly?: boolean;
}

/**
 * A button that tracks the promise returned by its own `onClick`.
 *
 * While that promise is pending the button disables itself and shows a
 * spinner, which both signals progress on Drive-backed actions and prevents a
 * second click from issuing or uploading the same thing twice.
 */
export default function AsyncButton({
    onClick,
    children,
    disabled,
    spinnerOnly = false,
    ...props
}: AsyncButtonProps): ReactElement {
    const [isPending, setIsPending] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        return (): void => {
            isMounted.current = false;
        };
    }, []);

    const run = async (): Promise<void> => {
        if (isPending) {
            return;
        }

        setIsPending(true);

        try {
            await onClick();
        } finally {
            // Many of these actions close their dialog on success, so the
            // button is often gone by the time the promise settles.
            if (isMounted.current) {
                setIsPending(false);
            }
        }
    };

    return (
        <Button
            {...props}
            disabled={disabled === true || isPending}
            onClick={() => void run()}
        >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {!(isPending && spinnerOnly) && children}
        </Button>
    );
}

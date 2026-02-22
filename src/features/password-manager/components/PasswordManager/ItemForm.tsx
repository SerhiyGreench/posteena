import { type ReactElement, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { Dices, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from 'ui/button';
import { Card, CardContent } from 'ui/card';
import { Input } from 'ui/input';
import type { PasswordItem } from '../../types';
import { generatePassword } from '../../utils/crypto';

const itemSchema = (
    t: (key: string) => string,
): z.ZodObject<{
    name: z.ZodString;
    email: z.ZodUnion<[z.ZodString, z.ZodString]>;
    username: z.ZodString;
    password: z.ZodString;
}> =>
    z.object({
        name: z
            .string()
            .min(1, t('validation.required').replace('{{field}}', t('name'))),
        email: z
            .string()
            .email(t('validation.invalidEmail'))
            .or(z.string().length(0)),
        username: z
            .string()
            .min(
                1,
                t('validation.required').replace('{{field}}', t('username')),
            ),
        password: z
            .string()
            .min(
                1,
                t('validation.required').replace('{{field}}', t('password')),
            ),
    });

export interface ItemFormProps {
    item?: PasswordItem;
    onSave: (item: Omit<PasswordItem, 'id'>) => void;
    onCancel: () => void;
}

export default function ItemForm({
    item,
    onSave,
    onCancel,
}: ItemFormProps): ReactElement {
    const { t } = useTranslation();

    const form = useForm({
        defaultValues: {
            name: item?.name || '',
            email: item?.email || '',
            username: item?.username || '',
            password: item?.password || '',
        },
        onSubmit: async ({ value }) => {
            onSave(value);
        },
    });

    useEffect(() => {
        form.reset({
            name: item?.name || '',
            email: item?.email || '',
            username: item?.username || '',
            password: item?.password || '',
        });
    }, [item, form]);

    return (
        <Card className="mb-6">
            <CardContent className="pt-6">
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        void form.handleSubmit();
                    }}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <form.Field
                            name="name"
                            validators={{
                                onChange: ({ value }) => {
                                    const res =
                                        itemSchema(t).shape.name.safeParse(
                                            value,
                                        );
                                    return res.success
                                        ? undefined
                                        : res.error.errors[0].message;
                                },
                            }}
                        >
                            {field => (
                                <div className="space-y-1">
                                    <Input
                                        key={`item-name-${t('name')}`}
                                        id={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder={t('name')}
                                        className={
                                            field.state.meta.errors.length > 0
                                                ? 'border-destructive'
                                                : ''
                                        }
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <p className="text-destructive text-xs">
                                            {String(field.state.meta.errors[0])}
                                        </p>
                                    )}
                                </div>
                            )}
                        </form.Field>

                        <form.Field
                            name="email"
                            validators={{
                                onChange: ({ value }) => {
                                    const res =
                                        itemSchema(t).shape.email.safeParse(
                                            value,
                                        );
                                    return res.success
                                        ? undefined
                                        : res.error.errors[0].message;
                                },
                            }}
                        >
                            {field => (
                                <div className="space-y-1">
                                    <Input
                                        key={`item-email-${t('email')}`}
                                        id={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder={t('email')}
                                        className={
                                            field.state.meta.errors.length > 0
                                                ? 'border-destructive'
                                                : ''
                                        }
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <p className="text-destructive text-xs">
                                            {String(field.state.meta.errors[0])}
                                        </p>
                                    )}
                                </div>
                            )}
                        </form.Field>

                        <form.Field
                            name="username"
                            validators={{
                                onChange: ({ value }) => {
                                    const res =
                                        itemSchema(t).shape.username.safeParse(
                                            value,
                                        );
                                    return res.success
                                        ? undefined
                                        : res.error.errors[0].message;
                                },
                            }}
                        >
                            {field => (
                                <div className="space-y-1">
                                    <Input
                                        key={`item-username-${t('username')}`}
                                        id={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder={t('username')}
                                        className={
                                            field.state.meta.errors.length > 0
                                                ? 'border-destructive'
                                                : ''
                                        }
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <p className="text-destructive text-xs">
                                            {String(field.state.meta.errors[0])}
                                        </p>
                                    )}
                                </div>
                            )}
                        </form.Field>

                        <form.Field
                            name="password"
                            validators={{
                                onChange: ({ value }) => {
                                    const res =
                                        itemSchema(t).shape.password.safeParse(
                                            value,
                                        );
                                    return res.success
                                        ? undefined
                                        : res.error.errors[0].message;
                                },
                            }}
                        >
                            {field => (
                                <div className="space-y-1">
                                    <div className="group/password relative">
                                        <Input
                                            key={`item-password-${t('password')}`}
                                            id={field.name}
                                            type="text"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={e =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={t('password')}
                                            className={
                                                field.state.meta.errors.length >
                                                0
                                                    ? 'border-destructive pr-10 font-mono'
                                                    : 'pr-10 font-mono'
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-0 right-0 h-full w-10 hover:bg-transparent"
                                            onClick={() =>
                                                field.handleChange(
                                                    generatePassword(),
                                                )
                                            }
                                            title={t('generate')}
                                        >
                                            <Dices className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
                                        </Button>
                                    </div>
                                    {field.state.meta.errors.length > 0 && (
                                        <p className="text-destructive text-xs">
                                            {String(field.state.meta.errors[0])}
                                        </p>
                                    )}
                                </div>
                            )}
                        </form.Field>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            type="button"
                        >
                            {t('cancel')}
                        </Button>
                        <form.Subscribe
                            selector={state => [
                                state.canSubmit,
                                state.isSubmitting,
                            ]}
                        >
                            {([canSubmit, isSubmitting]) => (
                                <Button
                                    type="submit"
                                    disabled={!canSubmit || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        t('save')
                                    )}
                                </Button>
                            )}
                        </form.Subscribe>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

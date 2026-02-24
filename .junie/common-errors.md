# Common Mistakes & Errors

This file tracks common mistakes made during development to avoid repeating them in the future.

## React & TypeScript

- **Manual `children` definition:** Avoid using `children: React.ReactNode`.
    - **Correction:** Use `PropsWithChildren` from `react`.
- **`React.*` prefix usage:** Avoid using the `React.` prefix for hooks, types, or components (e.g., `React.useState`, `React.ReactNode`).
    - **Correction:** Use named imports from `react`.
- **Modifying the `ui/` folder:** The `ui/` folder contains vendor/system components (Shadcn/Base UI) and should not be modified. This is a very strict rule.

## Project Structure

- **One File - One Component Violation:** Do not put multiple components in a single file.
    - **Correction:** Follow the "One File - One Component" rule in `RULES.md`. Create a dedicated folder for components with subcomponents.

- **Missing return types:** All functions and components in `src/` must have an explicit return type.
    - **Correction:** Add `: void`, `: ReactElement`, or other appropriate return types.
- **Adding file extensions in imports:** Do not include `.ts` or `.tsx` extensions in import statements. This is now technically enforced via `tsconfig.json`.
    - **Correction:** Remove the extension (e.g., `import { MyComponent } from './MyComponent';`).

## Internationalization (i18n)

- **Hardcoded strings in components:** All user-facing text, including tooltips, placeholders, and labels, must be internationalized.
    - **Correction:** Use the `t()` function from `useTranslation` hook or the `Messages` constant. Ensure all keys are added to `src/constants/Translations.ts` for all supported languages.
- **Dynamic validation messages:** When using Zod or other validation libraries, do not use hardcoded error messages.
    - **Correction:** Pass the `t` function to your schema or use translation keys that can be resolved at runtime.

## Reuse & Extension (Very Strict)

- **Do not reinvent patterns**: Reuse existing architecture and APIs (e.g., Password Manager’s hook + adapter + component layering).
    - **Correction:** Prefer extracting common parts and extending existing utilities over introducing parallel, incompatible solutions. Create adapters with the same surface where possible.

## Forms & Components

- **Direct usage of `Label` and error messages in forms:** Avoid using `Label` and manual `<p>` or `<span>` for error messages when building forms.
    - **Correction:** Use "canonical grforms" by utilizing the `Field`, `FieldLabel`, `FieldContent`, and `FieldError` components from `ui/field.tsx`. This ensures consistent layout, accessibility, and error handling across the application.

- **Missing user feedback for background or async actions:** Avoid performing actions like "copy to clipboard" or background saves without providing visual confirmation to the user.
    - **Correction:** Provide immediate feedback using disappearing tooltips near the action source (e.g., "Copied!" tooltip on a copy button) for local actions, or toast notifications (via `sonner`) for global/important events. Tooltips are preferred for "copied to clipboard" to keep focus near the button. Use `toast.success(t('copiedToClipboard'))` only if a tooltip is not feasible.

- **Using italic fonts:** Avoid using `italic` class or `<i>`/`<em>` tags for text styling.
    - **Correction:** Use different font weights, colors, or sizes to provide emphasis instead.

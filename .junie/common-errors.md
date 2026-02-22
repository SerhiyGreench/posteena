# Common Mistakes & Errors

This file tracks common mistakes made during development to avoid repeating them in the future.

## React & TypeScript

- **Manual `children` definition:** Avoid using `children: React.ReactNode`.
    - **Correction:** Use `PropsWithChildren` from `react`.
- **`React.*` prefix usage:** Avoid using the `React.` prefix for hooks, types, or components (e.g., `React.useState`, `React.ReactNode`).
    - **Correction:** Use named imports from `react`.
- **Modifying the `ui/` folder:** The `ui/` folder contains vendor/system components (Shadcn/Base UI) and should not be modified unless explicitly requested.

## Project Structure

- **One File - One Component Violation:** Do not put multiple components in a single file.
    - **Correction:** Follow the "One File - One Component" rule in `RULES.md`. Create a dedicated folder for components with subcomponents.

- **Missing return types:** All functions and components in `src/` must have an explicit return type.
    - **Correction:** Add `: void`, `: ReactElement`, or other appropriate return types.
- **Adding file extensions in imports:** Do not include `.ts` or `.tsx` extensions in import statements. This is now technically enforced via `tsconfig.json`.
    - **Correction:** Remove the extension (e.g., `import { MyComponent } from './MyComponent';`).

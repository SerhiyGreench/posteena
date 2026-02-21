# Core Project Guidelines

To maintain high code quality and consistency, all contributors (including LLMs) must follow these core rules:

## 1. TypeScript & Strong Typing

- **Strict No `any` Policy:** The use of `any` is strictly prohibited in the entire codebase. No exceptions.
    - Use proper interfaces or types for all data structures.
    - Use generics (`<T>`) for flexible, type-safe functions and components.
    - Use `unknown` if the type is truly unknown at compile time, then use type guards or assertions to safely narrow it down.
    - Ensure all third-party library integrations are properly typed, using `@types` packages or custom `.d.ts` declarations if necessary.
- **Interfaces over Types:** Prefer `interface` over `type` for object definitions.
- **Return Types:** Explicit return types are **mandatory** for all functions and components.
- **Constants as Enums:** Use `as const` for enums and prefer aliases using `as const` over union types. This applies to all routes and i18n message paths. Use `UpperCamelCase` for constant names.
    - _Example:_ `Theme.Light` instead of `'light'`.
    - _Example:_ `Routes.Home` instead of `'/'`.
- **Naming Conventions:** All files should be named according to their main export (e.g., if a file exports a component `Header`, it must be named `Header.tsx`).
- **Documentation:** All constants (routes, themes, languages, etc.) should be clearly described/commented.
- **Storage:** Use the custom reactive storage utility (via `src/lib/storage.ts`) for all persistent data instead of direct `localStorage` access. This utility uses `useSyncExternalStore` for reactive updates across components and tabs without external library dependencies.

## 2. React Best Practices

- **Props:** Use destructured props in component signatures.
- **Context:** Prefer `Context` over deep prop drilling when necessary.
- **Providers:** Use providers for global data storage and bypassing data through the component tree.
- **Hooks:** Extract common workflows into custom hooks to avoid duplication and keep components clean.
- **Libraries:** Prefer implementing small hooks or functions over installing new external libraries for simple tasks.
- **Specific Imports (mandatory):** Only use named imports from React (e.g., `import { useState, useEffect } from 'react'`). Do not use `import * as React from 'react'` or `import React from 'react'`.
- **JSX Types:** Do not use `JSX.*` types (e.g., prefer `React.ReactElement` or `React.ReactNode` over `JSX.Element`).
- **SSR Safety:** Use `ClientOnly` component (`src/components/ClientOnly.tsx`) for components/hooks that depend on browser APIs.

## 3. Naming Conventions

- **Variables:** Use `lowerCamelCase` for all variable names. Prefer `const` over `let`; avoid `var` entirely.
- **Components:** Use `UpperCamelCase` for component names and their file names (e.g., `Header.tsx`).
- **Functions & Hooks:** Use `lowerCamelCase` for functions and hooks, and their file names (e.g., `useLocale.ts`).
- **Constants:** Use `UpperCamelCase` for global constants and their file names (e.g., `Routes.ts`). Types derived from these constants should be named by appending `Type` to the constant name (e.g., `RoutesType` for the type derived from `Routes`).
- **Instances & Utilities:** Use `lowerCamelCase` for instances (like `i18n`) and utilities, and their file names (e.g., `i18n.ts`, `storage.ts`).
- **Folders:** Use `hyphen-case` (kebab-case) for all directory names. No other case is allowed for folders.
- **Modules:** Modules containing components should also use `UpperCamelCase` and match the component name.
- **Imports:** Use absolute paths with aliases (e.g., `@/components/Header` or `#/paraglide/messages`) instead of relative paths (e.g., `../components/Header`).
- **i18next messages:** All translation resources must be defined with `as const` in `src/constants/Translations.ts`. The `Messages` constant in `src/constants/Messages.ts` is automatically generated from the English translations (`Translations.en`) using the utility in `src/utils/generateMessages.ts`. This includes support for nested objects (which are flattened to `UpperCamelCase` keys), ensuring translation keys stay in sync while providing full type safety throughout the application.
    - _Example:_ If `Translations.en` has `theme: { light: "..." }`, use `t(Messages.ThemeLight)`.
- **Routes:** All route paths must be defined in `src/constants/Routes.ts` using `as const`. Components and route definitions must use these constants instead of hardcoded strings.
- **Exports:** All components must have a `default export` of the component. Export props separately if they are necessary for external use.
- **One File - One Export:** Follow the "one file, one export" principle as a general rule. Exceptions are allowed only when:
    - A file contains a component and its associated props interface.
    - A file contains a context provider and its associated custom hook.
    - A file contains a main export and its closely related small helper types or constants that are not used elsewhere.
- **Index Files:** Use `index.ts/tsx` for re-exporting only if a component or function uses other internal functions or components that are specific to it. Single-purpose files should remain standalone without a dedicated folder.
    - _Example:_ A `Header` folder is only justified if it contains `Header.tsx` and a `HeaderLink.tsx` used exclusively within `Header`. Otherwise, use `Header.tsx` directly in `src/components/`.
    - Mandatory `export { default } from './MyComponent';` in the `index` file for such folders.

## 4. Styling & UI

- **Tailwind CSS:** Use Tailwind CSS (v4) for all styling. Keep styling minimal and focused on positioning.
- **Shadcn UI:** Use Shadcn UI components (built on `@base-ui/react`) for the base UI system.
- **Customization:** Prefer minor styling over strict Shadcn UI usage as is; focus primarily on positioning and sizes.
- **Mobile First:** The application is designed with a mobile-first approach.

## 5. Code Quality

- **Variables:** Prefer `const` over `let`. Avoid `var` entirely.
- **Duplicates:** Heavily avoid any code duplication. Extract shared logic into utilities or hooks.
- **Formatting:** Ensure all code is formatted with Prettier and passes Oxlint checks before submission. Import sorting is mandatory and managed by Prettier.
- **Readability:** Maintain clean code by adding an empty line before and after blocks (e.g., `if`, `for`, `switch`) and before `return` statements.
- **Minimalism:** Avoid unnecessary code, such as redundant `return` statements in functions (use early returns or simplify logic where possible).
- **Client-Side Rendering (SSR/Hydration Safety):** For components or hooks that must only execute or render on the client-side (e.g., to prevent hydration mismatches or server-side execution of client-only libraries), use the `ClientOnly` component (`src/components/ClientOnly.tsx`) as a wrapper.

## 6. Localization

- **Up-to-date Messages:** All localized messages must be kept up to date. English (`en.json`) is the primary source of truth. Whenever `en.json` is changed, all other translation files (e.g., `uk.json`) must be updated accordingly to maintain parity and avoid missing translations in other locales.
- **Message IDs:** As noted in naming conventions, use `lowerCamelCase` for message IDs.

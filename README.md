# Vite Exporter Plugin

The Vite Exporter Plugin automatically generates an `index.ts` file that exports all modules from a specified directory. This is useful for organizing and managing your exports in a Vite project.

## Installation

Install the plugin using npm or yarn:

```sh
npm install vite-exporter
# or
yarn add vite-exporter
```

## Usage

Add the plugin to your Vite configuration:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { generateIndexPlugin } from 'vite-exporter';

export default defineConfig({
  plugins: [
    generateIndexPlugin({
      dirs: ['src/components', 'src/utils'], // Directories to generate index.ts for
      excludes: ['**/*.test.ts', '**/*.spec.ts'], // Optional: patterns to exclude
    }),
  ],
});
```

## Options

- `dirs`: An array of directories to generate `index.ts` files for.
- `excludes`: An optional array of glob patterns to exclude certain files.

## Example

Given the following directory structure:

```
src/
  components/
    Button.tsx
    Input.tsx
  utils/
    format.ts
    parse.ts
```

The plugin will generate the following `index.ts` files:

```typescript
// src/components/index.ts
export { default as Button } from './Button';
export { default as Input } from './Input';

// src/utils/index.ts
export * from './format';
export * from './parse';
```

## License

MIT
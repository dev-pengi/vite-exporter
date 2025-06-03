# Vite Exporter Plugin

The Vite Exporter Plugin automatically generates `index.ts` files that exports all modules from a specified directory. This is useful for organizing and managing your exports in a Vite project.

## Installation

```sh
npm install vite-exporter
# or
yarn add vite-exporter
```

## Quick Start

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { generateIndexPlugin } from "vite-exporter";

export default defineConfig({
  plugins: [
    generateIndexPlugin({
      dirs: ["src/components", "src/utils"],
    }),
  ],
});
```

file changes will be detected and the index.ts file will be updated automatically.

## Configuration

### Basic Configuration

```typescript
import { generateIndexPlugin, LogLevel, ProcessingMode } from "vite-exporter";

export default defineConfig({
  plugins: [
    generateIndexPlugin({
      dirs: ["src/components", "src/utils"], // Required: directories to process
      extensions: [".ts", ".tsx", ".js", ".jsx"], // File extensions (default shown)
      debounceMs: 2000, // Debounce timing (default: 2000)
      logLevel: LogLevel.DEBUG, // Log verbosity (default: INFO)
      mode: ProcessingMode.ExportsOnly, // Processing mode (default: ExportsOnly)
    }),
  ],
});
```

### Advanced Per-Directory Configuration

You can now specify different matching, exclusion patterns, and processing modes for each directory:

```typescript
generateIndexPlugin({
  dirs: [
    // Simple string format (uses global settings)
    "src/utils",

    // Advanced configuration with per-directory settings
    {
      dir: "src/components",
      match: ["**/*.tsx", "**/*.ts"], // Only include TypeScript files
      exclude: ["**/*.test.*", "**/*.stories.*"], // Exclude test and story files
      mode: ProcessingMode.ExportsOnly, // Only export files that have exports
    },
    {
      dir: "src/api",
      match: "endpoints/**/*", // Only include files in endpoints subdirectory
      exclude: ["**/*.mock.ts"], // Exclude mock files
      mode: ProcessingMode.ExportsAndImports, // Export files with exports, import others for side effects
    },
    {
      dir: "src/setup",
      mode: ProcessingMode.ImportAll, // Import all files (exports + side effects)
    },
  ],
  logLevel: LogLevel.DEBUG,
});
```

### Processing Modes

The plugin supports three processing modes that determine how files without exports are handled:

```typescript
enum ProcessingMode {
  ExportsOnly = "exports-only", // Only export files that have exports - ignores files with no exports
  ExportsAndImports = "exports-and-imports", // Export files with exports, import files without exports for side effects
  ImportAll = "import-all", // Import all files - exports for files with exports, side-effect imports for files without
}
```

#### ExportsOnly (default)

- Only includes files that have exports
- Files without exports are ignored
- Clean, minimal index files

#### ExportsAndImports

- Includes files with exports as exports
- Includes files without exports as side-effect imports
- Useful for libraries with both exports and initialization code

#### ImportAll

- Includes all files that match patterns
- Files with exports become exports
- Files without exports become side-effect imports
- Ensures all code is included and executed

### Pattern Matching

The plugin uses [minimatch](https://www.npmjs.com/package/minimatch) for pattern matching, supporting:

- `**/*` - Match all files (default)
- `**/*.tsx` - Match only .tsx files
- `components/**/*` - Match files in components subdirectory
- `!**/*.test.*` - Exclude test files (use in exclude array)
- `*.{ts,tsx}` - Match .ts or .tsx files

## Directory Configuration Options

| Option    | Type                 | Default       | Description                         |
| --------- | -------------------- | ------------- | ----------------------------------- |
| `dir`     | `string`             | **Required**  | Directory path to process           |
| `match`   | `string \| string[]` | `["**/*"]`    | Glob patterns to include files      |
| `exclude` | `string \| string[]` | `[]`          | Glob patterns to exclude files      |
| `mode`    | `ProcessingMode`     | `ExportsOnly` | How to handle files without exports |

## Global Configuration Options

| Option       | Type                      | Default                          | Description                     |
| ------------ | ------------------------- | -------------------------------- | ------------------------------- |
| `dirs`       | `(string \| DirConfig)[]` | **Required**                     | Directories to process          |
| `extensions` | `string[]`                | `['.ts', '.tsx', '.js', '.jsx']` | File extensions to include      |
| `debounceMs` | `number`                  | `2000`                           | Debounce timing in milliseconds |
| `logLevel`   | `LogLevel`                | `LogLevel.INFO`                  | Logging verbosity level         |
| `mode`       | `ProcessingMode`          | `ProcessingMode.ExportsOnly`     | Default processing mode         |

## Log Levels

```typescript
LogLevel.SILENT; // No output
LogLevel.ERROR; // Only errors
LogLevel.WARN; // Errors and warnings
LogLevel.INFO; // Standard info (default)
LogLevel.DEBUG; // Debug information
LogLevel.VERBOSE; // All details
```

## Logging Output

The new logging system provides beautiful, colored output with timestamps:

```
15:30:45 [Vite Exporter] INFO    🚀 Plugin initialized with configuration:
┌─ Configuration
│ Directories: src/components, src/utils
│ Extensions: .ts, .tsx, .js, .jsx
│ Debounce: 1500ms
│ Log Level: DEBUG
│ Mode: exports-only
└─

15:30:45 [Vite Exporter] DEBUG   👀 Watching directory: src/components
15:30:45 [Vite Exporter] SUCCESS 📝 Generated index.ts in src/components with 5 exports
15:30:46 [Vite Exporter] DEBUG   ➕ File ADD: src/components/NewComponent.tsx
15:30:48 [Vite Exporter] SUCCESS 📝 Generated index.ts in src/components with 6 exports
```

## Generated Files

Given this structure:

```
src/
  components/
    Button.tsx        // export default Button + named exports
    Input.tsx         // export default Input
    Select.ts         // only named exports
    database.init.ts  // no exports, side effects only
```

With **ExportsOnly** mode (default):

```typescript
{
  dir: 'src/components',
  mode: ProcessingMode.ExportsOnly
}
```

The plugin generates:

```typescript
// src/components/index.ts
// This file is auto-generated by vite-exporter-plugin
export { default as Button } from "./Button";
export * from "./Button";
export { default as Input } from "./Input";
export * from "./Select";
// database.init.ts is ignored (no exports)
```

With **ExportsAndImports** mode:

```typescript
{
  dir: 'src/components',
  mode: ProcessingMode.ExportsAndImports
}
```

The plugin generates:

```typescript
// src/components/index.ts
// This file is auto-generated by vite-exporter-plugin
export { default as Button } from "./Button";
export * from "./Button";
export { default as Input } from "./Input";
export * from "./Select";
import "./database.init";
```

## Configuration Options

| Option       | Type                      | Default                          | Description                     |
| ------------ | ------------------------- | -------------------------------- | ------------------------------- |
| `dirs`       | `(string \| DirConfig)[]` | **Required**                     | Directories to process          |
| `extensions` | `string[]`                | `['.ts', '.tsx', '.js', '.jsx']` | File extensions to include      |
| `debounceMs` | `number`                  | `2000`                           | Debounce timing in milliseconds |
| `logLevel`   | `LogLevel`                | `LogLevel.INFO`                  | Logging verbosity level         |
| `mode`       | `ProcessingMode`          | `ProcessingMode.ExportsOnly`     | Default processing mode         |

## Examples

### Component Library with Tests

```typescript
generateIndexPlugin({
  dirs: [
    {
      dir: "src/components",
      match: ["**/*.tsx", "**/*.ts"],
      exclude: ["**/*.test.*", "**/*.stories.*", "**/__tests__/**"],
      mode: ProcessingMode.ExportsOnly,
    },
  ],
});
```

### API Endpoints with Side Effects

```typescript
generateIndexPlugin({
  dirs: [
    {
      dir: "src/api",
      match: "endpoints/**/*.ts",
      exclude: ["**/*.mock.ts", "**/*.spec.ts"],
      mode: ProcessingMode.ExportsAndImports, // Include initialization files
    },
  ],
});
```

### Setup with Initialization Files

```typescript
generateIndexPlugin({
  dirs: [
    {
      dir: "src/setup",
      match: ["**/*.ts"],
      mode: ProcessingMode.ExportsAndImports, // Import files for side effects
    },
  ],
});
```

### Multiple Directories with Different Rules

```typescript
generateIndexPlugin({
  dirs: [
    "src/utils", // Simple: match everything
    {
      dir: "src/components",
      exclude: ["**/*.test.*", "**/*.stories.*"],
    },
    {
      dir: "src/hooks",
      match: "use*.ts", // Only hook files
    },
    {
      dir: "src/config",
      mode: ProcessingMode.ExportsAndImports, // Side-effect imports
    },
  ],
});
```

## Troubleshooting

**Enable verbose logging to see everything:**

```typescript
generateIndexPlugin({
  dirs: ["src/components"],
  logLevel: LogLevel.VERBOSE,
});
```

**Common issues:**

- Files not detected → Check `extensions` configuration and `match` patterns
- Too many updates slow down the build → Increase `debounceMs` value
- Files excluded → Check `exclude` patterns and ensure they use forward slashes
- Side-effect imports not working → Use `ProcessingMode.ExportsAndImports` or `ImportAll`

## Migration Guide

### From v1.x to v2.x

```typescript
// Old (v1.x)
generateIndexPlugin({
  dirs: ["src/components"],
  excludes: ["**/*.test.ts", "**/*.spec.ts"], // Global excludes
  enableDebugging: true,
  enableDebuggingVerbose: true,
});

// New (v2.x)
generateIndexPlugin({
  dirs: [
    "src/utils",
    {
      dir: "src/components",
      // not match pattern/patterns so all files will be imported from
      exclude: ["**/*.test.ts", "**/*.spec.ts"], // Per-directory excludes
    },
  ],
  logLevel: LogLevel.VERBOSE,
});
```

## License

MIT License

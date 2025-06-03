# Changesets

This project uses Changesets to manage versioning and changelogs.

## Setup

1. Install the dependencies:

   ```sh
   npm install
   ```

2. Initialize Changesets:
   ```sh
   npx changeset init
   ```

## Creating a Changeset

To create a new changeset, run:

```sh
npm run changeset
```

Follow the prompts to describe your changes. This will create a new markdown file in the `.changeset` directory.

## Releasing

When you're ready to release, run:

```sh
npx changeset version
```

This will update the versions in your `package.json` files and create changelog entries.

To publish the packages, run:

```sh
npm publish
```

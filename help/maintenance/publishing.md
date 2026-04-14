---
title: Publishing
group: Maintenance
category: Release Process
---

# Publishing

## Pre-publish checklist

1. Update `package.json` metadata and the npm package name.
2. Confirm the README reflects the current validation API.
3. Confirm [Checks API](../reference/checks.md) matches the exported classes and types.
4. Run `npm run lint`.
5. Run `npm test`.
6. Run `npm run build`.
7. Review the generated files in `dist/`.
8. Verify the package entrypoint exports what consumers need.

## Publish command

```bash
npm publish --access public
```

If the package should be private or scoped differently, adjust `publishConfig` first.

## Recommended release check

After building, verify the generated package surface from a consumer point of view:

```ts
import {
	ObjectCheck,
	FieldCheck,
	ArrayCheck,
	FileCheck,
	ImageCheck,
	StringCheck,
	NumberCheck,
	DateCheck,
	type ResultSet
} from '@samatawy/checks';
```

If that import shape changes, update the README and docs before publishing.
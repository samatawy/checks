---
title: Examples
children:
  - ./shared-model.md
  - ./object-caching-http-example.md
  - ./object-caching-mongodb-express-example.md
  - ./in-memory-type-store-testing-example.md
---

# Examples

Use this section when you want end-to-end patterns instead of isolated API reference or task-oriented recipes.

These examples also show custom domain-related actions that sit outside the base `TypeStore` API. In this set, `PersonDto` supports tag management through explicit `addTag(...)` and `removeTag(...)` flows.

Pages in this section:

- [Shared Model](shared-model.md) for the DTO, validation, shared request/query types, and domain-specific tag behavior used by the example flows
- [Client using http](object-caching-http-example.md) for a cache-backed client store that talks to an HTTP API
- [Server using Mongodb](object-caching-mongodb-express-example.md) for an Express server whose store persists data in MongoDB
- [Unit testing with InMemoryTypeStore](in-memory-type-store-testing-example.md) for using a reusable in-memory store in unit tests, including custom domain actions

Suggested reading order:

1. Start with [Shared Model](shared-model.md) to see the DTO, tag methods, and input shapes both examples rely on.
2. Read [Client using http](object-caching-http-example.md) for the consumer-side pattern.
3. Read [Server using Mongodb](object-caching-mongodb-express-example.md) for the persistence and endpoint implementation.
4. Read [Unit testing with InMemoryTypeStore](in-memory-type-store-testing-example.md) for the lightweight testing pattern.

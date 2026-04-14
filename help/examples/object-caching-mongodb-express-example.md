---
title: Server using Mongodb
group: Examples
category: Caching And Stores
---

# Server using Mongodb

This example shows the server-side half of the flow. It backs the `/api/people` endpoints with MongoDB while still using `ObjectFactory`, `TypeStore`, and `CachedObjectStore`.

Start with the shared DTO and request/query types from [Shared Model](shared-model.md). This page focuses on the persistence store and the Express endpoints.

It also demonstrates custom domain-related actions, specifically tag management, through explicit store methods and endpoints.

The responsibilities stay separated:

- the shared model defines `PersonDto`, `CreatePersonInput`, `UpdatePersonInput`, `AddTagInput`, `PersonQuery`, and the outward JSON shape
- `ObjectFactory` validates and hydrates `PersonDto` instances from request payloads and database documents
- `PersonApiStore` handles persistence against MongoDB
- Express maps HTTP requests to store operations
- `CachedObjectStore` adds in-memory caching on top of the MongoDB-backed store

## Scenario

Assume an Express server exposes:

- `GET /api/people/:id`
- `GET /api/people`
- `GET /api/people/search`
- `POST /api/people`
- `PATCH /api/people/:id`
- `DELETE /api/people/:id`
- `POST /api/people/:id/tags`
- `DELETE /api/people/:id/tags/:tag`

MongoDB stores documents in a `people` collection with the shape:

```json
{
  "_id": "1",
  "name": "Ada",
  "title": "Architect"
}
```

## MongoDB-Backed PersonApiStore

```ts
import {
  CachedObjectStore,
  ObjectFactory,
  type ItemEnvelope,
  type QueryableCachedTypeStore,
} from '@samatawy/checks';
import type { Collection, Filter, WithId } from 'mongodb';
import {
  AddTagInput,
  CreatePersonInput,
  PersonDto,
  PersonQuery,
  UpdatePersonInput,
  personToJson,
} from './shared-model';

type PersonDocument = {
  _id: string;
  name: string;
  title?: string;
  tags?: string[];
};

class PersonApiStore
  implements QueryableCachedTypeStore<PersonDto, string, CreatePersonInput, UpdatePersonInput, PersonQuery> {
  public readonly ttl_ms = 30_000;

  constructor(private readonly people: Collection<PersonDocument>) {}

  keyOf(person: PersonDto): string {
    return person.personId;
  }

  canCache(person: PersonDto): boolean {
    return person.personTitle !== 'Draft';
  }

  async fetch(id: string): Promise<PersonDto | undefined> {
    const doc = await this.people.findOne({ _id: id });
    if (!doc) {
      return undefined;
    }

    return this.toDto(doc);
  }

  async list(options?: PersonQuery): Promise<ItemEnvelope<PersonDto>> {
    const page = Math.max(options?.page ?? 1, 1);
    const pageSize = Math.max(options?.pageSize ?? 25, 1);
    const skip = (page - 1) * pageSize;

    const [docs, total] = await Promise.all([
      this.people
        .find({}, { sort: { name: 1 }, skip, limit: pageSize })
        .toArray(),
      this.people.countDocuments({}),
    ]);

    return {
      items: await Promise.all(docs.map(doc => this.toDto(doc))),
      meta: { page, pageSize, total },
      raw: docs,
    };
  }

  async query(query: PersonQuery): Promise<ItemEnvelope<PersonDto>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.max(query.pageSize ?? 25, 1);
    const skip = (page - 1) * pageSize;

    const filter: Filter<PersonDocument> = {};
    if (query.title) {
      filter.title = query.title;
    }
    if (query.tag) {
      filter.tags = query.tag;
    }

    const [docs, total] = await Promise.all([
      this.people
        .find(filter, { sort: { name: 1 }, skip, limit: pageSize })
        .toArray(),
      this.people.countDocuments(filter),
    ]);

    return {
      items: await Promise.all(docs.map(doc => this.toDto(doc))),
      meta: { page, pageSize, total },
      raw: docs,
    };
  }

  async create(input: CreatePersonInput): Promise<PersonDto> {
    const created = await ObjectFactory.createOrThrow(input, PersonDto);

    const doc: PersonDocument = {
      _id: created.personId,
      name: created.personName,
      title: created.personTitle,
      tags: created.personTags,
    };

    await this.people.insertOne(doc);
    return created;
  }

  async update(existing: PersonDto, input: UpdatePersonInput): Promise<PersonDto> {
    const updated = await ObjectFactory.updateOrThrow(existing, input, PersonDto);

    await this.people.updateOne(
      { _id: existing.personId },
      {
        $set: {
          name: updated.personName,
          title: updated.personTitle,
          tags: updated.personTags,
        },
      },
    );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.people.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async addTag(personId: string, input: AddTagInput): Promise<PersonDto> {
    const existing = await this.fetch(personId);
    if (!existing) {
      throw new Error(`Person ${personId} was not found.`);
    }

    const updated = existing.addTag(input.tag);

    await this.people.updateOne(
      { _id: personId },
      {
        $set: {
          tags: updated.personTags,
        },
      },
    );

    return updated;
  }

  async removeTag(personId: string, tag: string): Promise<PersonDto> {
    const existing = await this.fetch(personId);
    if (!existing) {
      throw new Error(`Person ${personId} was not found.`);
    }

    const updated = existing.removeTag(tag);

    await this.people.updateOne(
      { _id: personId },
      {
        $set: {
          tags: updated.personTags,
        },
      },
    );

    return updated;
  }

  private async toDto(doc: WithId<PersonDocument> | PersonDocument): Promise<PersonDto> {
    return ObjectFactory.createOrThrow(
      {
        id: doc._id,
        name: doc.name,
        title: doc.title,
        tags: doc.tags ?? [],
      },
      PersonDto,
    );
  }
}
```

This keeps MongoDB details inside the store implementation. The rest of the application works with validated `PersonDto` objects.

## Register The Store

```ts
import express from 'express';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URL!);
await client.connect();

const db = client.db('app');
const peopleCollection = db.collection<PersonDocument>('people');

const personApi = new PersonApiStore(peopleCollection);

const people = new CachedObjectStore().registerTypeStore(
  PersonDto,
  personApi,
);

const app = express();
app.use(express.json());
```

## Express Endpoints Using The Store

```ts
app.get('/api/people/:id', async (req, res, next) => {
  try {
    const person = await people.fetch(PersonDto, req.params.id);
    if (!person) {
      res.status(404).json({ message: 'Person not found' });
      return;
    }

    res.json(personToJson(person));
  } catch (error) {
    next(error);
  }
});

app.get('/api/people', async (req, res, next) => {
  try {
    const result = await people.list(PersonDto, {
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 25,
      sort: { by: 'name', direction: 'asc' },
    });

    res.json({
      items: result.items.map(personToJson),
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/people/search', async (req, res, next) => {
  try {
    const result = await people.query(PersonDto, {
      title: typeof req.query.title === 'string' ? req.query.title : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 25,
    });

    res.json({
      items: result.items.map(personToJson),
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/people', async (req, res, next) => {
  try {
    const created = await people.create(PersonDto, req.body);
    res.status(201).json(personToJson(created));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/people/:id', async (req, res, next) => {
  try {
    const existing = await people.fetch(PersonDto, req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Person not found' });
      return;
    }

    const updated = await people.update(PersonDto, existing, req.body);
    res.json(personToJson(updated));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/people/:id', async (req, res, next) => {
  try {
    const deleted = await people.delete(PersonDto, req.params.id);
    res.status(deleted ? 204 : 404).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/people/:id/tags', async (req, res, next) => {
  try {
    const updated = await personApi.addTag(req.params.id, req.body);
    res.json(personToJson(updated));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/people/:id/tags/:tag', async (req, res, next) => {
  try {
    const updated = await personApi.removeTag(req.params.id, req.params.tag);
    res.json(personToJson(updated));
  } catch (error) {
    next(error);
  }
});
```

## Notes

- The MongoDB collection stores raw persistence documents, while the rest of the application deals in validated DTOs from [Shared Model](shared-model.md).
- `CachedObjectStore` caches successful reads and writes, so repeated `GET /api/people/:id` calls can avoid another database query until eviction.
- `canCache(...)` lets the store skip caching selected results without changing the HTTP or MongoDB code.
- `addTag(...)` and `removeTag(...)` are custom domain-related actions. They belong on the concrete store because they are specific to the `PersonDto` model, not to the generic store contract.
- For production code, add unique indexes, duplicate-key handling, request-level validation error mapping, and server shutdown logic for the MongoDB client.
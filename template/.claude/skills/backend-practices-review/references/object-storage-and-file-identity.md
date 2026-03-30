# Object Storage and File Identity

Use this reference when the broader backend review narrows to file/blob durability and canonical identity.

## Default Position

Prefer S3-compatible object storage for normal user-uploaded files, generated assets, and any workload that must survive redeploys, horizontal scaling, or host replacement.

Treat host-local disk as one of two things only:
- an explicit single-host product tradeoff
- a staging area on the way to durable storage

## Canonical File Reference

The database should persist a durable storage identifier, not a serving URL.

Good default fields:
- `storage_provider` or `service_name`
- `bucket` / container name
- `object_key`
- `original_filename`
- `content_type`
- `byte_size`
- `checksum`
- ownership reference (`user_id`, `document_id`, tenant, etc.)
- timestamps and lifecycle status

The object key is the durable identity. Access URLs are derived views.

## Why Keys Beat URLs

Persisting full URLs couples the database to:
- the current bucket hostname
- the CDN or proxy shape
- whether access is public or presigned
- future provider changes

Persist the key once, then decide later whether to serve through:
- an app-owned stable URL
- a short-lived presigned URL
- a CDN URL built from the current delivery policy

## Server-Generated Keys

Generate object keys server-side.

Use filenames from the client only as metadata for display or audit.
Do not make them the canonical storage path because they are unstable, user-controlled, and collision-prone.

Good key traits:
- unique
- opaque enough to avoid collisions and guessability
- organized enough for human debugging if needed
- decoupled from future public URL structure

## When Database Storage Might Still Be Justified

Do not default to DB blobs for ordinary uploads.

Revisit database storage only when the binary is:
- small and tightly bounded
- transactionally coupled to the row that owns it
- unlikely to create operational pain from replication, backup, or query latency

When that becomes the main question, route schema depth to `postgres-master`.

## Anti-Patterns

- Storing presigned URLs in the database
- Making public URLs the source of truth
- Using user filenames as canonical object keys
- Treating bucket metadata as the primary business record
- Assuming local disk is “durable enough” in a multi-instance or containerized deployment

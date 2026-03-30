# Upload Transport and Large Files

Use this reference when large payload movement becomes the main backend risk surface.

## Default Transfer Strategy

Choose the simplest transport that safely matches the workload.

Preferred order:
1. Direct-to-object-storage upload with app-issued presigned access when the app only needs to authorize and track the file
2. App-proxied streaming upload to object storage or a staging file when the backend must inspect, transform, or tightly control the transfer
3. Chunked/resumable upload only when pause/resume, unstable networks, or very large transfers justify the extra state machine

## Streaming Default

For large uploads, stream bytes as they arrive.

Do not normalize large transfers into:
- `byte[]`
- full in-memory multipart buffers
- request-thread object graphs that hold the whole file before writing it

Streaming should usually pair with incremental checksum or byte counting so the system can validate integrity without re-reading more than necessary.

## Chunking and Resumability

Chunked/resumable upload is justified when:
- users are on unreliable or mobile networks
- files are large relative to expected upload speed
- pause/resume is a product requirement
- restarting the full upload is materially expensive

Avoid chunking when it adds protocol and state complexity without solving a real problem.

Extra responsibilities come with chunking:
- upload/session identity
- offset tracking
- idempotent chunk application
- per-upload locking
- expiration and cleanup of abandoned partials

## Staging and Finalization

If uploads pass through the backend, prefer a staged flow:
- create upload/session record
- stream to staging or object storage
- record size/checksum/progress
- finalize after validation succeeds

Do not mark a file ready merely because the last byte arrived.

## Review Questions

- Does the code stream or buffer?
- Is resumability solving a real reliability problem?
- Are partial uploads isolated from ready files?
- Is finalization idempotent if the last step retries?
- Can two writers corrupt the same upload state?

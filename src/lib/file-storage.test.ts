import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";

const blobFiles = new Map<string, Uint8Array>();

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string, body: Uint8Array) => {
    blobFiles.set(pathname, body);
    return { pathname };
  }),
  get: vi.fn(async (pathname: string) => {
    const bytes = blobFiles.get(pathname);
    if (!bytes) return null;
    return {
      statusCode: 200,
      blob: {
        contentType: "application/pdf",
        etag: "etag"
      },
      stream: new Blob([bytes]).stream()
    };
  })
}));

let tempDirs: string[] = [];
const previousVercel = process.env.VERCEL;
const previousBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const previousStorage = process.env.VISAFILER_STORAGE;

afterEach(async () => {
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;

  if (previousBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = previousBlobToken;

  if (previousStorage === undefined) delete process.env.VISAFILER_STORAGE;
  else process.env.VISAFILER_STORAGE = previousStorage;

  blobFiles.clear();
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("file storage", () => {
  test("writes local files when persistent blob storage is not enabled", async () => {
    const { readStoredFile, writeStoredFile } = await import("./file-storage");
    const dir = await mkdtemp(path.join(tmpdir(), "visafiler-file-storage-"));
    tempDirs.push(dir);
    const localPath = path.join(dir, "generated", "tm7.pdf");

    const storagePath = await writeStoredFile({
      bytes: new Uint8Array([1, 2, 3]),
      blobPathname: "generated/tm7.pdf",
      contentType: "application/pdf",
      localPath
    });

    expect(storagePath).toBe(localPath);
    expect(await readFile(localPath)).toEqual(Buffer.from([1, 2, 3]));
    expect(await readStoredFile(storagePath)).toEqual(Buffer.from([1, 2, 3]));
  });

  test("uses private Vercel Blob storage when deployed with a blob token", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    const { readStoredFile, storedFileExists, writeStoredFile } = await import("./file-storage");

    const storagePath = await writeStoredFile({
      bytes: new Uint8Array([4, 5, 6]),
      blobPathname: "generated/tm7.pdf",
      contentType: "application/pdf",
      localPath: path.join(tmpdir(), "tm7.pdf")
    });

    expect(storagePath).toBe("blob:generated/tm7.pdf");
    expect(await storedFileExists(storagePath)).toBe(true);
    expect(await readStoredFile(storagePath)).toEqual(Buffer.from([4, 5, 6]));
  });
});

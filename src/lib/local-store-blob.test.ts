import { afterEach, describe, expect, test, vi } from "vitest";

let blobText: string | null = null;

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (_pathname: string, body: string | Uint8Array) => {
    blobText = typeof body === "string" ? body : new TextDecoder().decode(body);
    return { pathname: "app/store.json" };
  }),
  get: vi.fn(async () => {
    if (!blobText) return null;
    return {
      statusCode: 200,
      blob: {
        contentType: "application/json",
        etag: "etag"
      },
      stream: new Blob([blobText]).stream()
    };
  })
}));

const previousVercel = process.env.VERCEL;
const previousBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

afterEach(() => {
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;

  if (previousBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = previousBlobToken;

  blobText = null;
  vi.resetModules();
});

describe("LocalStore blob persistence", () => {
  test("persists app data to private Vercel Blob when a blob token is configured", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    const { LocalStore } = await import("./local-store");

    const store = new LocalStore();
    await store.update((data) => ({
      ...data,
      profiles: [
        {
          id: "profile_1",
          legalFirstName: "Alex",
          legalFamilyName: "Morgan",
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z"
        }
      ]
    }));

    expect(blobText).toContain("\"legalFirstName\": \"Alex\"");

    const reloaded = new LocalStore();
    expect((await reloaded.read()).profiles[0]).toMatchObject({
      id: "profile_1",
      legalFirstName: "Alex"
    });
  });
});

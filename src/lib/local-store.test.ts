import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { getDataDir, LocalStore } from "./local-store";

let tempDirs: string[] = [];
const previousVercel = process.env.VERCEL;

afterEach(async () => {
  if (previousVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = previousVercel;
  }
  delete process.env.VISAFILER_DATA_DIR;
  delete process.env.VISADESK_DATA_DIR;
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("LocalStore", () => {
  test("creates an empty store and persists profile updates", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visafiler-store-"));
    tempDirs.push(dir);
    const store = new LocalStore(dir);

    const initial = await store.read();
    expect(initial.profiles).toEqual([]);
    expect(initial.documents).toEqual([]);
    expect(initial.packets).toEqual([]);

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

    const reloaded = new LocalStore(dir);
    expect((await reloaded.read()).profiles[0]).toMatchObject({
      id: "profile_1",
      legalFirstName: "Alex"
    });
  });

  test("uses writable temporary storage on Vercel", () => {
    process.env.VERCEL = "1";

    expect(getDataDir()).toBe(path.join(tmpdir(), "visafiler-data"));
  });

  test("serializes concurrent local updates without corrupting the JSON store", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visafiler-store-"));
    tempDirs.push(dir);
    const store = new LocalStore(dir);

    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        store.update((data) => ({
          ...data,
          profiles: [
            ...data.profiles,
            {
              id: `profile_${index}`,
              legalFirstName: `Applicant ${index}`,
              legalFamilyName: "Morgan",
              createdAt: "2026-05-25T00:00:00.000Z",
              updatedAt: "2026-05-25T00:00:00.000Z"
            }
          ]
        }))
      )
    );

    const raw = await readFile(path.join(dir, "store.json"), "utf-8");
    expect(JSON.parse(raw).profiles).toHaveLength(8);
  });
});

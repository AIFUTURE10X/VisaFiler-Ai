import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { LocalStore } from "./local-store";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("LocalStore", () => {
  test("creates an empty store and persists profile updates", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "visadesk-store-"));
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
});

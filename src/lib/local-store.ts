import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isBlobStorageEnabled, readStoredFile, storedFileExists, toBlobStoragePath, writeStoredFile } from "./file-storage";
import { emptyAppData, type AppData } from "./types";

const appDataBlobPathname = "app/store.json";

export class LocalStore {
  private readonly filePath: string;
  private updateQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly dataDir = getDataDir()) {
    this.filePath = path.join(dataDir, "store.json");
  }

  async read(): Promise<AppData> {
    if (isBlobStorageEnabled()) {
      const storagePath = toBlobStoragePath(appDataBlobPathname);
      if (!(await storedFileExists(storagePath))) {
        const initial = emptyAppData();
        await this.write(initial);
        return initial;
      }

      const raw = await readStoredFile(storagePath);
      return { ...emptyAppData(), ...JSON.parse(raw.toString("utf-8")) } as AppData;
    }

    await mkdir(this.dataDir, { recursive: true });

    try {
      const raw = await readFile(this.filePath, "utf-8");
      return { ...emptyAppData(), ...JSON.parse(raw) } as AppData;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        const initial = emptyAppData();
        await this.write(initial);
        return initial;
      }

      throw error;
    }
  }

  async write(data: AppData): Promise<void> {
    const serialized = `${JSON.stringify(data, null, 2)}\n`;

    if (isBlobStorageEnabled()) {
      await writeStoredFile({
        localPath: this.filePath,
        blobPathname: appDataBlobPathname,
        bytes: new TextEncoder().encode(serialized),
        contentType: "application/json"
      });
      return;
    }

    await mkdir(this.dataDir, { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, serialized, "utf-8");
    await rename(tempPath, this.filePath);
  }

  async update(updater: (data: AppData) => AppData | Promise<AppData>): Promise<AppData> {
    const run = async () => {
      const current = await this.read();
      const next = await updater(current);
      await this.write(next);
      return next;
    };

    const result = this.updateQueue.then(run, run);
    this.updateQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }
}

export const getDataDir = () =>
  process.env.VISAFILER_DATA_DIR
    ? path.resolve(process.cwd(), process.env.VISAFILER_DATA_DIR)
    : process.env.VISADESK_DATA_DIR
      ? path.resolve(process.cwd(), process.env.VISADESK_DATA_DIR)
      : process.env.VERCEL
        ? path.join(tmpdir(), "visafiler-data")
      : getDefaultDataDir();
export const getUploadsDir = () => path.join(getDataDir(), "uploads");
export const getGeneratedDir = () => path.join(getDataDir(), "generated");

function getDefaultDataDir(): string {
  const legacyDir = path.join(process.cwd(), ".visadesk-data");
  return existsSync(legacyDir) ? legacyDir : path.join(process.cwd(), ".visafiler-data");
}

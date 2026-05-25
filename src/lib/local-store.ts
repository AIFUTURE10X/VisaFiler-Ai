import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyAppData, type AppData } from "./types";

export class LocalStore {
  private readonly filePath: string;

  constructor(private readonly dataDir = getDataDir()) {
    this.filePath = path.join(dataDir, "store.json");
  }

  async read(): Promise<AppData> {
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
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  }

  async update(updater: (data: AppData) => AppData | Promise<AppData>): Promise<AppData> {
    const current = await this.read();
    const next = await updater(current);
    await this.write(next);
    return next;
  }
}

export const getDataDir = () =>
  process.env.VISAFILER_DATA_DIR
    ? path.resolve(process.cwd(), process.env.VISAFILER_DATA_DIR)
    : process.env.VISADESK_DATA_DIR
      ? path.resolve(process.cwd(), process.env.VISADESK_DATA_DIR)
      : getDefaultDataDir();
export const getUploadsDir = () => path.join(getDataDir(), "uploads");
export const getGeneratedDir = () => path.join(getDataDir(), "generated");

function getDefaultDataDir(): string {
  const legacyDir = path.join(process.cwd(), ".visadesk-data");
  return existsSync(legacyDir) ? legacyDir : path.join(process.cwd(), ".visafiler-data");
}

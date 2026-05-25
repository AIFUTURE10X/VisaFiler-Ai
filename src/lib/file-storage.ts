import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

const blobPrefix = "blob:";

export function isBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) && (process.env.VERCEL === "1" || process.env.VISAFILER_STORAGE === "blob");
}

export function toBlobStoragePath(pathname: string): string {
  return `${blobPrefix}${pathname}`;
}

export function fromBlobStoragePath(storagePath: string): string | null {
  return storagePath.startsWith(blobPrefix) ? storagePath.slice(blobPrefix.length) : null;
}

export async function writeStoredFile(input: {
  localPath: string;
  blobPathname: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<string> {
  if (!isBlobStorageEnabled()) {
    await mkdir(path.dirname(input.localPath), { recursive: true });
    await writeFile(input.localPath, input.bytes);
    return input.localPath;
  }

  const blob = await put(input.blobPathname, Buffer.from(input.bytes), {
    access: "private",
    allowOverwrite: true,
    contentType: input.contentType,
    cacheControlMaxAge: 60
  });

  return toBlobStoragePath(blob.pathname);
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  const pathname = fromBlobStoragePath(storagePath);
  if (!pathname) {
    return readFile(storagePath);
  }

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error("Stored file not found.");
  }

  const bytes = await new Response(result.stream).arrayBuffer();
  return Buffer.from(bytes);
}

export async function storedFileExists(storagePath: string): Promise<boolean> {
  const pathname = fromBlobStoragePath(storagePath);
  if (!pathname) {
    try {
      await access(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  const result = await get(pathname, { access: "private" });
  return result?.statusCode === 200;
}

export function getStoredFileName(storagePath: string): string {
  return path.basename(fromBlobStoragePath(storagePath) ?? storagePath);
}

import { createServerFn } from "@tanstack/react-start";
import { generateSecureToken } from "./crypto";

// Use Temps Blob storage if available, fall back to local filesystem
const useBlobStorage = !!process.env.TEMPS_BLOB_URL;

// Lazy-init blob client singleton
let _blobClient: ReturnType<typeof import("@temps-sdk/blob").createBlobClient> | null = null;
async function getBlobClient() {
  if (!_blobClient) {
    const { createBlobClient } = await import("@temps-sdk/blob");
    _blobClient = createBlobClient();
  }
  return _blobClient;
}

const dataDir = process.env.DATA_DIR || process.cwd();
const uploadDir = `${dataDir}/uploads`;

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }

    const file = data.get("file");

    if (!file || !(file instanceof File)) {
      throw new Error("No file provided");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB");
    }

    return { file };
  })
  .handler(async ({ data }) => {
    const { file } = data;

    const ext = file.name.substring(file.name.lastIndexOf("."));
    const randomName = generateSecureToken(16);
    const filename = `${randomName}${ext}`;

    if (useBlobStorage) {
      const blob = await getBlobClient();
      const result = await blob.put(`uploads/${filename}`, file, {
        contentType: file.type,
        addRandomSuffix: false,
      });
      return { url: result.url, filename: result.pathname };
    }

    const filePath = `${uploadDir}/${filename}`;
    try {
      await Bun.write(filePath, file);
      return { url: `/uploads/${filename}`, filename };
    } catch {
      throw new Error("Failed to save file");
    }
  });

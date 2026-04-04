import { createServerFn } from "@tanstack/react-start";
import { generateSecureToken } from "./crypto";
import { S3Client } from "bun";

// Use S3 storage if blob endpoint is available (injected by Temps), fall back to local filesystem
const blobEndpoint = process.env.BLOB_ENDPOINT || process.env.S3_ENDPOINT;
const useBlobStorage = !!blobEndpoint;

// Singleton S3 client — Bun reads AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from env automatically
const s3 = useBlobStorage
  ? new S3Client({
      endpoint: blobEndpoint,
      accessKeyId: process.env.BLOB_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.BLOB_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.BLOB_REGION || "us-east-1",
      bucket: process.env.S3_BUCKET || "uploads",
    })
  : null;

const dataDir = process.env.DATA_DIR || process.cwd();
const uploadDir = `${dataDir}/uploads`;

if (useBlobStorage) {
  console.log(`[upload] Using S3 storage at ${blobEndpoint}`);
} else {
  console.log(`[upload] Using local filesystem at ${uploadDir}`);
}

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

    if (s3) {
      const key = `uploads/${filename}`;
      await s3.write(key, file, { type: file.type });
      // Return presigned URL for reading (1 year expiry)
      const url = s3.presign(key, { expiresIn: 60 * 60 * 24 * 365 });
      return { url, filename: key };
    }

    const filePath = `${uploadDir}/${filename}`;
    try {
      await Bun.write(filePath, file);
      return { url: `/uploads/${filename}`, filename };
    } catch {
      throw new Error("Failed to save file");
    }
  });

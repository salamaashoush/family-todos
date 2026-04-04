import { S3Client } from "bun";
import { generateSecureToken } from "./crypto";

const blobEndpoint = process.env.BLOB_ENDPOINT || process.env.S3_ENDPOINT;

const s3 = blobEndpoint
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

if (s3) {
  console.log(`[upload] Using S3 storage at ${blobEndpoint}`);
} else {
  console.log(`[upload] Using local filesystem at ${uploadDir}`);
}

export async function saveFile(file: File): Promise<{ url: string; filename: string }> {
  const ext = file.name.substring(file.name.lastIndexOf("."));
  const randomName = generateSecureToken(16);
  const filename = `${randomName}${ext}`;

  if (s3) {
    const key = `uploads/${filename}`;
    await s3.write(key, file, { type: file.type });
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
}

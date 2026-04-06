import { createServerFn } from "@tanstack/react-start";
import { saveFile } from "./storage.server";
import { getTenantContext } from "../utils/tenant";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }

    const file = data.get("file");

    if (!file || !(file instanceof File)) {
      throw new Error("No file provided");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error("File must be an image (JPEG, PNG, GIF, WebP, or SVG)");
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB");
    }

    return { file };
  })
  .handler(async ({ data }) => {
    await getTenantContext();
    return saveFile(data.file);
  });

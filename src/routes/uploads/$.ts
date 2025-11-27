import { createFileRoute } from "@tanstack/react-router";
import { log } from "../../utils/logger";

const dataDir = process.env.DATA_DIR || process.cwd();
const uploadDir = `${dataDir}/uploads`;

export const Route = createFileRoute("/uploads/$")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ params }) => {
        const filename = params._splat;

        if (!filename) {
          log.warn("Upload request without filename");
          return new Response("Not found", { status: 404 });
        }

        // Prevent directory traversal - only get the basename
        const safeName = filename.split("/").pop() || "";
        if (!safeName || safeName.includes("..")) {
          log.warn("Invalid upload filename", { filename });
          return new Response("Not found", { status: 404 });
        }

        const filePath = `${uploadDir}/${safeName}`;

        try {
          const file = Bun.file(filePath);
          const exists = await file.exists();

          if (!exists) {
            log.warn("Upload file not found", { filePath });
            return new Response("Not found", { status: 404 });
          }

          log.info("Serving upload", { filePath, type: file.type, size: file.size });

          return new Response(file, {
            headers: {
              "Content-Type": file.type,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (err) {
          log.error("Error serving upload", err, { filePath });
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});

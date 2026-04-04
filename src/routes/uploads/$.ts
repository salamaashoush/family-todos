import { createFileRoute } from "@tanstack/react-router";

const dataDir = process.env.DATA_DIR || process.cwd();
const uploadDir = `${dataDir}/uploads`;

// Serves locally-stored uploads (used when Temps Blob is not available)
export const Route = createFileRoute("/uploads/$")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ params }) => {
        const filename = params._splat;

        if (!filename) {
          return new Response("Not found", { status: 404 });
        }

        // Prevent directory traversal - only get the basename
        const safeName = filename.split("/").pop() || "";
        if (!safeName || safeName.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const filePath = `${uploadDir}/${safeName}`;

        try {
          const file = Bun.file(filePath);
          const exists = await file.exists();

          if (!exists) {
            return new Response("Not found", { status: 404 });
          }

          return new Response(file, {
            headers: {
              "Content-Type": file.type,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});

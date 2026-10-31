import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/push/key")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { cors } = await import("@/lib/push.server");
        return new Response(null, { status: 204, headers: cors(request) });
      },
      GET: async ({ request }) => {
        const { getVapid, json } = await import("@/lib/push.server");
        return json(request, { publicKey: (await getVapid()).publicKey });
      },
    },
  },
});

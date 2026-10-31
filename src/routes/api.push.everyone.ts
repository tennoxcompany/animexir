import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/push/everyone")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { cors } = await import("@/lib/push.server");
        return new Response(null, { status: 204, headers: cors(request) });
      },
      POST: async ({ request }) => {
        const { json, sendEveryone } = await import("@/lib/push.server");
        const body = (await request.json().catch(() => ({}))) as { messageId?: unknown };
        if (typeof body.messageId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.messageId)) return json(request, { error: "messageId gerekli" }, 400);
        const r = await sendEveryone(body.messageId);
        return json(request, r, "status" in r ? r.status : 200);
      },
    },
  },
});

export const MOD_CHANNEL = "mod-kanali";

export const isEveryone = (body: string) => /^\/everyone\b/i.test(body.trim());

export const everyoneText = (body: string) => body.trim().replace(/^\/everyone\b/i, "").trim();

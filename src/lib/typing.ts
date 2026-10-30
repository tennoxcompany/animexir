import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type TypingPayload = { from?: string; typing?: boolean };
type Listener = (p: TypingPayload) => void;

// İki kişi aynı kanal adını kullanmalı; kanal sayfa boyunca açık tutulur ki aynı adla iki kez abone olunup çökmesin.
const channels = new Map<string, { ch: RealtimeChannel; listeners: Set<Listener> }>();

function typingChannel(a: string, b: string) {
  const topic = `typing:${[a, b].sort().join(":")}`;
  let entry = channels.get(topic);
  if (!entry) {
    const listeners = new Set<Listener>();
    const ch = supabase.channel(topic)
      .on("broadcast", { event: "typing" }, ({ payload }) => listeners.forEach((l) => l(payload as TypingPayload)));
    ch.subscribe();
    entry = { ch, listeners };
    channels.set(topic, entry);
  }
  return entry;
}

export function useTyping(me: string, friendId: string) {
  const [friendTyping, setFriendTyping] = useState(false);
  const lastSent = useRef(0);

  useEffect(() => {
    const { listeners } = typingChannel(me, friendId);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listener: Listener = (p) => {
      if (p.from !== friendId) return;
      clearTimeout(timer);
      setFriendTyping(!!p.typing);
      if (p.typing) timer = setTimeout(() => setFriendTyping(false), 4000);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); clearTimeout(timer); setFriendTyping(false); };
  }, [me, friendId]);

  const send = (typing: boolean) =>
    typingChannel(me, friendId).ch.send({ type: "broadcast", event: "typing", payload: { from: me, typing } });

  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastSent.current < 1500) return;
    lastSent.current = now;
    send(true);
  };

  const stopTyping = () => {
    if (!lastSent.current) return;
    lastSent.current = 0;
    send(false);
  };

  return { friendTyping, notifyTyping, stopTyping };
}

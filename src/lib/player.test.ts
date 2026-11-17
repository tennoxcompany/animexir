import { describe, expect, it } from "vitest";
import { isDirectVideo, isHlsVideo, normalizeVideoSource, playerTime, subtitleToVtt } from "./player";

describe("episode links and embed codes", () => {
  it("extracts only the HTTPS source from an iframe", () => {
    expect(normalizeVideoSource('<iframe src="https://example.org/embed/bolum-1?lang=tr&amp;quality=hd" onload="alert(1)"></iframe>'))
      .toBe("https://example.org/embed/bolum-1?lang=tr&quality=hd");
  });
  it("keeps direct video links playable and permits clearing a source", () => {
    expect(normalizeVideoSource(" https://example.org/turkce.mp4 ")).toBe("https://example.org/turkce.mp4");
    expect(normalizeVideoSource("  ")).toBe("");
  });
  it("rejects executable sources and markup without an iframe source", () => {
    for (const source of ["javascript:alert(1)", "data:text/html,test", "http://example.org/video", '<script src="https://example.org/a"></script>', '<iframe srcdoc="test"></iframe>', '<iframe src="javascript:alert(1)"></iframe>', "https://user:password@example.org/video"]) {
      expect(() => normalizeVideoSource(source)).toThrow();
    }
  });
});

describe("video sources", () => {
  it("recognizes direct MP4 and HLS links without treating embed pages as video", () => {
    expect(isDirectVideo("https://example.org/episode.mp4?token=x")).toBe(true);
    expect(isDirectVideo("https://example.org/episode.m3u8#video")).toBe(true);
    expect(isHlsVideo("https://example.org/episode.m3u8?key=x")).toBe(true);
    expect(isHlsVideo("https://example.org/episode.mp4")).toBe(false);
    expect(isDirectVideo("https://vidnest.fun/anime/1/1/sub")).toBe(false);
  });
});
describe("subtitles and timeline", () => {
  it("converts SRT time codes and preserves Turkish characters", () => {
    expect(subtitleToVtt("\uFEFF1\r\n00:00:01,000 --> 00:00:03,250\r\nTürkçe altyazı"))
      .toBe("WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.250\nTürkçe altyazı");
  });
  it("keeps existing VTT intact", () => {
    const source = "WEBVTT\n\n00:01.000 --> 00:03.000\nMerhaba";
    expect(subtitleToVtt(source)).toBe(source);
  });
  it("formats elapsed time including long episodes", () => {
    expect(playerTime(65)).toBe("1:05");
    expect(playerTime(3661)).toBe("1:01:01");
    expect(playerTime(Infinity)).toBe("0:00");
  });
});
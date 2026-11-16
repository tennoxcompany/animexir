import { describe, expect, it } from "vitest";
import { isDirectVideo, isHlsVideo, playerTime, subtitleToVtt } from "./player";

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
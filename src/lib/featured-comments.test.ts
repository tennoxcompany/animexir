import { describe, expect, it } from "vitest";
import { selectFeaturedComments, type FeaturedComment } from "./featured-comments";

const comment = (id: string, animeId: string, body = "Bu bölüm çok güzeldi."): FeaturedComment => ({
  id, body, user_id: "viewer", profiles: null, episodes: { anime_id: animeId, number: 1 },
});

describe("featured anime comment ticker", () => {
  it("only includes comments on an anime shown in the featured selection", () => {
    expect(selectFeaturedComments([comment("a", "featured"), comment("b", "other")], ["featured"]).map((c) => c.id)).toEqual(["a"]);
  });
  it("does not invent an entry when there are no comments", () => {
    expect(selectFeaturedComments([], ["featured"])).toEqual([]);
  });
  it("excludes empty comments", () => {
    expect(selectFeaturedComments([comment("a", "featured", "  ")], ["featured"])).toEqual([]);
  });
});
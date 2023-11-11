import { Router, Context } from "https://deno.land/x/oak@v12.1.0/mod.ts";
export const router = new Router();

const kv = await Deno.openKv();

interface ScoreKey {
  username: string;
  level: string;
  coins: number;
  neutral_was_used: boolean;
}

const score_key_to_string = (key: ScoreKey) => {
  return `${key.username};${key.level};${key.coins};${key.neutral_was_used}`;
};

const string_to_score_key = (key: string): ScoreKey => {
  const [username, level, coins, neutral_was_used] = key.split(";");
  return {
    username: username,
    level: level,
    coins: parseInt(coins),
    neutral_was_used: neutral_was_used === "true",
  };
};

router.get("/", (ctx: Context) => {
  ctx.response.body = "Hello, Volatile Particle!";
});

router.post(`/score`, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    const score_key = score_key_to_string({
      username: body.username,
      level: body.level,
      coins: body.coins,
      neutral_was_used: body.neutral_was_used,
    });
    kv.set(["scores", score_key], body.score);

    ctx.response.status = 200;
  } catch {
    ctx.throw(400);
  }
});

router.get(`/score`, async (ctx: Context) => {
  const username = ctx.request.url.searchParams.get("username");
  const level = ctx.request.url.searchParams.get("level");
  const coins = ctx.request.url.searchParams.get("coins");
  const neutral_was_used = ctx.request.url.searchParams.get("neutral_was_used");

  if (!username || !level || !coins || !neutral_was_used) {
    ctx.throw(400);
  }
  const score_key = score_key_to_string({
    username: username,
    level: level,
    coins: parseInt(coins),
    neutral_was_used: neutral_was_used === "true",
  });
  const score = (await kv.get(["scores", score_key])).value;
  ctx.response.body = JSON.stringify({ score: score });
  ctx.response.status = 200;
});

interface LeaderboardEntry {
  rank?: number;
  username: string;
  score: number;
}

router.get(`/leaderboards`, async (ctx: Context) => {
  const username = ctx.request.url.searchParams.get("username");
  if (!username) {
    ctx.throw(400);
  }
  let leaderboards = new Map<[string, number], LeaderboardEntry[]>();
  const entries = kv.list({ prefix: ["scores"] });
  for await (const entry of entries) {
    const [_, key] = entry.key;
    const score_key = string_to_score_key(key);
    const value = entry.value;
    for (let coins = 0; coins <= score_key.coins; coins++) {
      if (!leaderboards[(score_key.level, coins)]) {
        leaderboards[(score_key.level, coins)] = [];
      }
      const leaderboard = leaderboards[(score_key.level, coins)];
      const new_entry = { username: score_key.username, score: value };
      const insert_index = leaderboard.findIndex(
        (entry) => entry.score < value
      );

      if (insert_index === -1) {
        leaderboard.push(new_entry);
      } else {
        leaderboard.splice(insert_index, 0, new_entry);
      }
    }
  }
  leaderboards.forEach((leaderboard, key, map) => {
    // Iterate over a copy of the leaderboard array to avoid issues while modifying it
    leaderboard.slice().forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const usernameRank = leaderboard.findIndex(
      (entry) => entry.username === username
    );

    // Filter the leaderboard array to keep only the relevant entries
    const filteredLeaderboard = leaderboard.filter(
      (_value, index) =>
        index === 0 || (usernameRank - 1 <= index && index <= usernameRank + 1)
    );

    // Update the leaderboard in the map with the filtered array
    map.set(key, filteredLeaderboard);
  });
  ctx.response.body = JSON.stringify(leaderboards);
});

import { Router, Context } from "https://deno.land/x/oak@v12.1.0/mod.ts";
export const router = new Router();

const kv = await Deno.openKv();

router.get("/", (ctx: Context) => {
  ctx.response.body = "Hello, Volatile Particle!";
});

router.post(`/score`, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    kv.set(
      ["scores", body.userId, body.level, body.coins, body.neutralWasUsed],
      body.score
    );

    ctx.response.status = 200;
  } catch {
    ctx.throw(400);
  }
});

router.post(`/username`, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    kv.set(["usernames", body.userId], body.username);

    ctx.response.status = 200;
  } catch {
    ctx.throw(400);
  }
});

router.get(`/score`, async (ctx: Context) => {
  const userId = ctx.request.url.searchParams.get("userId");
  const level = ctx.request.url.searchParams.get("level");
  const coins = ctx.request.url.searchParams.get("coins");
  const neutralWasUsed = ctx.request.url.searchParams.get("neutralWasUsed");

  if (!userId || !level || !coins || !neutralWasUsed) {
    ctx.throw(400);
  }

  const score = (
    await kv.get([
      "scores",
      userId,
      level,
      parseInt(coins),
      neutralWasUsed === "true",
    ])
  ).value;

  ctx.response.body = JSON.stringify({ score: score });
  ctx.response.status = 200;
});

interface LeaderboardEntry {
  rank?: number;
  userId: number;
  username?: string;
  score: number;
}

router.get(`/leaderboards`, async (ctx: Context) => {
  const clientUserId = ctx.request.url.searchParams.get("userId");
  if (!clientUserId) {
    ctx.throw(400);
  }
  const leaderboards: Record<string, Record<string, LeaderboardEntry[]>> = {};
  const kvEntries = kv.list<number>({ prefix: ["scores"] });

  for await (const kvEntry of kvEntries) {
    const [_, userId, level, coins] = kvEntry.key as [
      unknown,
      number,
      string,
      number
    ];
    const score = kvEntry.value;
    for (let c = 0; c <= coins; c++) {
      if (!leaderboards[level]) {
        leaderboards[level] = {};
      }
      const levelLeaderboard = leaderboards[level];
      if (!levelLeaderboard[c]) {
        levelLeaderboard[c] = [];
      }
      levelLeaderboard[c].push({ userId, score });
    }
  }

  await Promise.all(
    Object.values(leaderboards).map(async (levelLeaderboard) => {
      await Promise.all(
        Object.entries(levelLeaderboard).map(async ([key, entries]) => {
          entries.sort((a, b) => a.score - b.score);

          entries.forEach((entry, index) => {
            entry.rank = index + 1;
          });

          const userIdIndex = entries.findIndex(
            (entry) => entry.userId === parseInt(clientUserId)
          );

          levelLeaderboard[key] = entries.filter((_, index) =>
            userIdIndex == -1
              ? index < 4
              : index === 0 ||
                (userIdIndex - 1 <= index && index <= userIdIndex + 1)
          );

          const promises = levelLeaderboard[key].map(async (entry) => {
            entry.username = (await kv.get(["usernames", entry.userId]))
              .value as string;
          });

          await Promise.all(promises);
        })
      );
    })
  );

  ctx.response.body = JSON.stringify(leaderboards);
});

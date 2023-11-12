import { Router, Context } from "https://deno.land/x/oak@v12.1.0/mod.ts";
export const router = new Router();

const kv = await Deno.openKv();

const ENABLE_LOGGING = true;
const LOG_FULL_CONTEXT = false;

const log = (title: string, ctx: Context, additionalInfo?: any) => {
  if (!ENABLE_LOGGING) return;
  console.log(title);
  if (!LOG_FULL_CONTEXT && !additionalInfo) {
    return;
  }
  console.log("---------------------------------------------");
  if (LOG_FULL_CONTEXT) {
    console.log(ctx.request);
    console.log(ctx.response);
  }
  if (additionalInfo) {
    console.log(additionalInfo);
  }
  console.log("---------------------------------------------");
};
const logIncomingRequest = (
  requestType: string,
  endpoint: string,
  ctx: Context,
  additionalInfo?: any
) => {
  log(
    `Received ${requestType} request at   \t${endpoint}`,
    ctx,
    additionalInfo
  );
};

const logOutgoingResponse = (endpoint: string, ctx: Context) => {
  log(`Sending response from   \t${endpoint}`, ctx, ctx.response.body);
};

router.get("/", (ctx: Context) => {
  logIncomingRequest("GET", "/", ctx);
  ctx.response.body = "Hello, Volatile Particle!";
  logOutgoingResponse("/", ctx);
});

router.post(`/score`, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    logIncomingRequest("POST", "/score", ctx, body);
    const existingScore = await kv.get([
      "scores",
      body.userId,
      body.level,
      body.coins,
      body.neutralWasUsed,
    ]);
    if (existingScore < body.score) {
      ctx.response.status = 200;
      return;
    }
    kv.set(
      ["scores", body.userId, body.level, body.coins, body.neutralWasUsed],
      body.score
    );

    ctx.response.status = 200;
  } catch {
    logOutgoingResponse("/score", ctx);
    ctx.throw(400);
  }
  logOutgoingResponse("/score", ctx);
});

router.post(`/username`, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    logIncomingRequest("POST", "/username", ctx, body);
    kv.set(["usernames", body.userId], body.username);

    ctx.response.status = 200;
  } catch {
    logOutgoingResponse("/username", ctx);
    ctx.throw(400);
  }
  logOutgoingResponse("/username", ctx);
});

router.get(`/score`, async (ctx: Context) => {
  logIncomingRequest("GET", "/score", ctx);
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
  logOutgoingResponse("/score", ctx);
});

interface LeaderboardEntry {
  rank?: number;
  userId: number;
  username?: string;
  score: number;
}

router.get(`/leaderboards`, async (ctx: Context) => {
  const clientUserId = ctx.request.url.searchParams.get("userId");
  logIncomingRequest("GET", "/leaderboards", ctx);
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
            userIdIndex < 2
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
  logOutgoingResponse("/leaderboards", ctx);
});

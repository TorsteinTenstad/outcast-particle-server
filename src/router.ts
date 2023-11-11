import { Router, Context } from 'https://deno.land/x/oak@v12.1.0/mod.ts';
export const router = new Router();

const kv = await Deno.openKv();

router.get('/', (ctx: Context) => {
  ctx.response.body = 'Hello, Volatile Particle!';
});

router.post(`/score`, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    kv.set(
      ['scores', body.username, body.level, body.coins, body.neutralWasUsed],
      body.score
    );

    ctx.response.status = 200;
  } catch {
    ctx.throw(400);
  }
});

router.get(`/score`, async (ctx: Context) => {
  const username = ctx.request.url.searchParams.get('username');
  const level = ctx.request.url.searchParams.get('level');
  const coins = ctx.request.url.searchParams.get('coins');
  const neutralWasUsed = ctx.request.url.searchParams.get('neutralWasUsed');

  if (!username || !level || !coins || !neutralWasUsed) {
    ctx.throw(400);
  }

  const score = (
    await kv.get([
      'scores',
      username,
      level,
      parseInt(coins),
      neutralWasUsed === 'true',
    ])
  ).value;

  ctx.response.body = JSON.stringify({ score: score });
  ctx.response.status = 200;
});

interface LeaderboardEntry {
  rank?: number;
  username: string;
  score: number;
}

router.get(`/leaderboards`, async (ctx: Context) => {
  const username = ctx.request.url.searchParams.get('username');
  if (!username) {
    ctx.throw(400);
  }
  const leaderboards: Record<string, Record<string, LeaderboardEntry[]>> = {};
  const kvEntries = kv.list<number>({ prefix: ['scores'] });

  for await (const kvEntry of kvEntries) {
    const [_, username, level, coins] = kvEntry.key as [
      unknown,
      string,
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
      levelLeaderboard[c].push({ username, score });
    }
  }

  Object.values(leaderboards).forEach((levelLeaderboard) => {
    Object.entries(levelLeaderboard).forEach(([key, entries]) => {
      entries.sort((a, b) => a.score - b.score);

      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      const usernameIndex = entries.findIndex(
        (entry) => entry.username === username
      );

      levelLeaderboard[key] = entries.filter(
        (_, index) =>
          index === 0 ||
          (usernameIndex - 1 <= index && index <= usernameIndex + 1)
      );
    });
  });

  ctx.response.body = JSON.stringify(leaderboards);
});

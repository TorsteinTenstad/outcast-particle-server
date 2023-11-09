import { Router, Context } from 'https://deno.land/x/oak@v12.1.0/mod.ts';
export const router = new Router();

const kv = await Deno.openKv();

router.get('/', (ctx: Context) => {
  ctx.response.body = 'Hello, Egg Hunt!';
});

router.post(`/score`, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;

    kv.set(['scoreboard', body.username], body.score);

    console.log(`Score of ${body.username} is ${body.score}`);
    ctx.response.status = 200;
  } catch {
    ctx.throw(400);
  }
});

router.get(`/score`, async (ctx: Context) => {
  const username = ctx.request.url.searchParams.get('username');
  if (!username) {
    ctx.throw(400);
  }
  const score = (await kv.get(['scoreboard', username])).value;
  ctx.response.body = JSON.stringify({ score: score });
  ctx.response.status = 200;
});

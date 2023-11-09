import { Application } from 'https://deno.land/x/oak@v12.1.0/mod.ts';
import 'https://deno.land/x/dotenv@v3.2.2/load.ts';
import { router } from './router.ts';
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';

const app = new Application();

app.use(router.allowedMethods());
app.use(router.routes());
app.use(oakCors());

app.addEventListener('listen', () => {
  console.log(`Listening on: localhost:${port}`);
});

const port = 8000;
await app.listen({ port });

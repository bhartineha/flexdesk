import { createApp } from "./app";
import { env } from "./config/env";
import { startAutoReleaseRunner } from "./jobs/autoReleaseRunner";

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[flexdesk-api] listening on :${env.port} (${env.nodeEnv})`);
  startAutoReleaseRunner();
});

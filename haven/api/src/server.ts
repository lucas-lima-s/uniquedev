import { buildApp } from "./app.js";
import { sql } from "./db/client.js";
import { env } from "./env.js";
import { startReconciliationJob } from "./jobs/reconcile.js";
import { startInvestmentSnapshotJob } from "./jobs/snapshot-investments.js";

const app = buildApp();

let reconcileJob: ReturnType<typeof startReconciliationJob> | undefined;
let snapshotJob: ReturnType<typeof startInvestmentSnapshotJob> | undefined;

app.addHook("onClose", async () => {
  reconcileJob?.stop();
  snapshotJob?.stop();
  await sql.end();
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => void app.close());
}

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  reconcileJob = startReconciliationJob(app.log);
  snapshotJob = startInvestmentSnapshotJob(app.log);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

// Local run: node scripts/click-collect/cli.mjs  (env as for the Worker; DRY_RUN defaults to true)
import { run } from './src/run.mjs';
run(process.env).then((r) => process.exit(0)).catch((e) => { console.error(String(e.message || e).slice(0, 300)); process.exit(1); });

import { runLesson } from '../lib/run.mjs';
import { APPROVAL_NOTE } from './approval.mjs';
import { buildOptions } from './options.mjs';

await runLesson({ buildOptions, dryRunNote: APPROVAL_NOTE });

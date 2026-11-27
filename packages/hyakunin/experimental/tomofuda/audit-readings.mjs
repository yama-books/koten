import { parseAllReadings } from '../../../../tools/build-data/parse-readings.ts';
import { auditReadings } from './audit.mjs';

const source = parseAllReadings();
const reports = Object.entries(source).map(([name, poems]) => auditReadings(poems.map(p => ({
  id: `p${String(p.cardNo).padStart(3, '0')}`, no: p.cardNo, reading: p.ku.slice(0, 3).join(''),
})), name));
const [historical, modern] = reports;
const differences = historical.poems.filter((p, i) => p.computedKimariji !== modern.poems[i].computedKimariji)
  .map((p, i) => ({ no: p.no, historical: p.computedKimariji, modern: modern.poems.find(q => q.no === p.no).computedKimariji }));
console.log(JSON.stringify({ reports, differences, note: 'Diagnostic only; human review and approved fixed kimariji required.' }, null, 2));
if (reports.some(r => !r.matchesExpected)) process.exitCode = 2;

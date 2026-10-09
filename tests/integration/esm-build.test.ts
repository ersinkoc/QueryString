import { cpSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

// Audit F019: the ESM entry produced by `npm run build:esm` must be loadable by Node's ESM resolver.
describe('ESM build output', () => {
  const root = resolve(__dirname, '..', '..');
  let work: string;

  beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), 'qs-esm-build-'));
    for (const file of ['package.json', 'tsconfig.json']) {
      copyFileSync(join(root, file), join(work, file));
    }
    cpSync(join(root, 'src'), join(work, 'src'), { recursive: true });
    cpSync(join(root, 'scripts'), join(work, 'scripts'), { recursive: true });
    symlinkSync(join(root, 'node_modules'), join(work, 'node_modules'), 'junction');
  }, 60000);

  afterAll(() => {
    unlinkSync(join(work, 'node_modules'));
    rmSync(work, { recursive: true, force: true });
  });

  it('produces dist/index.mjs that Node can import and use (F019)', () => {
    mkdirSync(join(work, 'dist'), { recursive: true });
    const build = spawnSync('npm run build:esm', { cwd: work, shell: true, encoding: 'utf8' });
    expect(build.status).toBe(0);

    const script =
      "import qs, * as m from './dist/index.mjs';" +
      "console.log(JSON.stringify(m.parse('a=1&b[c]=2')), typeof qs.stringify, typeof m.QueryBuilder);";
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: work, encoding: 'utf8' });

    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.stdout.trim()).toBe('{"a":"1","b":{"c":"2"}} function function');
  }, 120000);
});

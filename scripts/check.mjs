import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = ['js', 'tests', 'scripts'].flatMap(directory =>
  readdirSync(directory, { recursive: true })
    .filter(file => /\.[cm]?js$/.test(file))
    .map(file => directory + '/' + file)
);
for (const file of files) {
  if (spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' }).status !== 0) process.exit(1);
}
console.log('Sintaxe verificada em ' + files.length + ' arquivos JavaScript.');

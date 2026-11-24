// Which commands write gigabytes. Everything else always runs: whoever has a full disk needs
// rm, git and docker prune to get out.
const AT = String.raw`(?:^|[;&|(\n]|\$\()[ \t]*(?:[A-Za-z_]\w*=\S*[ \t]+)*(?:(?:time|nice|nohup|sudo|exec|npx(?:[ \t]+-y)?|bunx|pnpm[ \t]+exec|uv[ \t]+run|poetry[ \t]+run|node|python3?[ \t]+-m)[ \t]+)*`;
// Options before a subcommand, with their value where they take one.
const VALUED = '-C|-F|-f|-p|-c|--dir|--prefix|--filter|--cwd|--file|--project-name|--project-directory|--profile|--env-file|--progress';
const OPTS = String.raw`(?:[ \t]+(?:${VALUED})[ \t=]\S+|[ \t]+(?!(?:${VALUED})[ \t=])-\S+)*[ \t]+`;
const END = String.raw`(?=[\s;&|)]|$)`;
// Asking for help or listing tests writes nothing.
const at = (s) => new RegExp(String.raw`${AT}${s}(?![^;&|\n]*\s--(?:help|version|clearCache|collect-only)\b)`);

const HEAVY = [
  [at(String.raw`docker[ \t]+(?:buildx[ \t]+)?(?:build|bake)${END}`), 'een image-build'],
  [at(String.raw`docker(?:[ \t]+|-)compose${OPTS}(?:build${END}|(?:up|run|create)${END}[^;&|\n]*[ \t]--build${END})`), 'een image-build'],
  [at(String.raw`docker[ \t]+pull${END}`), 'een image ophalen'],
  [at(String.raw`git${OPTS}worktree[ \t]+add${END}`), 'een nieuwe werkboom'],
  [at(String.raw`(?:npm|pnpm|yarn|bun)${OPTS}(?:ci|install|i|add)${END}`), 'een installatie'],
  [at(String.raw`(?:uv[ \t]+sync|uv[ \t]+pip[ \t]+install|pip3?[ \t]+install|poetry[ \t]+install|playwright[ \t]+install|brew[ \t]+install)${END}`), 'een installatie'],
  [at(String.raw`(?:pytest|vitest|jest|playwright[ \t]+test|e2e[ \t]+run)${END}`), 'een testrun'],
  [at(String.raw`(?:npm|pnpm|yarn|bun)${OPTS}(?:run[ \t]+)?(?:test|build|e2e)${END}`), 'een test- of buildrun'],
  [at(String.raw`(?:\S*/)?poort(?:\.mjs)?[ \t]+(?:run|exec|e2e)${END}`), 'een testrun'],
];

// Text in quotes and here-documents is data: a commit message about `npm install` installs nothing.
const bare = (cmd) =>
  cmd
    .replace(/<<-?[ \t]*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?(?:\n[ \t]*\2(?=\n|$)|$)/g, '\n')
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/\n\s*\n/g, '\n');

export function heavyCommand(cmd) {
  const text = bare(String(cmd || '').slice(0, 10000));
  return HEAVY.find(([re]) => re.test(text))?.[1] ?? null;
}

export const isImageBuild = (cmd) => heavyCommand(cmd) === 'een image-build';

export function heavyTool(tool, input = {}) {
  if (tool === 'Bash') return heavyCommand(input.command);
  if (tool === 'EnterWorktree') return 'een nieuwe werkboom';
  if ((tool === 'Agent' || tool === 'Task') && input.isolation === 'worktree') return 'een nieuwe werkboom';
  return null;
}

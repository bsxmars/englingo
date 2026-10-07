// A read-only file tree: the content directory on disk, or a map in tests.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface Entry {
  name: string;
  dir: boolean;
}

export interface FS {
  read(path: string): string;
  /** Entries of a directory, sorted by name: the course order. */
  list(path: string): Entry[];
  exists(path: string): boolean;
}

const byName = (a: Entry, b: Entry) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

export function dirFS(root: string): FS {
  return {
    read: (p) => readFileSync(join(root, p), 'utf8'),
    list: (p) =>
      readdirSync(join(root, p), { withFileTypes: true })
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => ({ name: e.name, dir: e.isDirectory() }))
        .sort(byName),
    exists: (p) => existsSync(join(root, p)) && statSync(join(root, p)).isFile(),
  };
}

/** mapFS is a tree in memory, for tests: file paths to contents, directories implied. */
export function mapFS(files: Record<string, string>): FS {
  return {
    read(p) {
      const data = files[p];
      if (data === undefined) throw new Error(`open ${p}: file does not exist`);
      return data;
    },
    list(p) {
      const prefix = p === '.' || p === '' ? '' : p + '/';
      const seen = new Map<string, boolean>();
      for (const name of Object.keys(files)) {
        if (!name.startsWith(prefix)) continue;
        const [first, ...rest] = name.slice(prefix.length).split('/');
        seen.set(first!, (seen.get(first!) ?? false) || rest.length > 0);
      }
      return [...seen].map(([name, dir]) => ({ name, dir })).sort(byName);
    },
    exists: (p) => p in files,
  };
}

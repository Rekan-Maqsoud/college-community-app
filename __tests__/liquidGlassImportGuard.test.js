import fs from 'fs';
import path from 'path';

const APP_ROOT = path.join(__dirname, '..', 'app');
const LIQUID_GLASS_PACKAGE = '@callstack/liquid-glass';
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

const isSourceFile = (fileName) => /\.(js|jsx)$/.test(fileName);

const walkDirectory = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      return walkDirectory(absolutePath);
    }

    return isSourceFile(entry.name) ? [absolutePath] : [];
  });
};

describe('Liquid Glass import guard', () => {
  it('does not allow liquid-glass imports in app source files', () => {
    const sourceFiles = walkDirectory(APP_ROOT);

    const importingFiles = sourceFiles
      .filter((sourceFile) => {
        const source = fs.readFileSync(sourceFile, 'utf8');
        return source.includes(LIQUID_GLASS_PACKAGE);
      })
      .map((absolutePath) => path.relative(path.join(__dirname, '..'), absolutePath));

    expect(importingFiles).toEqual([]);
  });

  it('does not include liquid-glass in package dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const dependencySections = [
      packageJson?.dependencies || {},
      packageJson?.devDependencies || {},
      packageJson?.peerDependencies || {},
      packageJson?.optionalDependencies || {},
      packageJson?.bundledDependencies || {},
    ];

    dependencySections.forEach((section) => {
      expect(section[LIQUID_GLASS_PACKAGE]).toBeUndefined();
    });
  });
});

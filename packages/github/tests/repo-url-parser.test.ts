import { describe, it, expect } from 'vitest';
import { RepoUrlParser } from '../src/index.js';

describe('@nimo-deck/github: RepoUrlParser', () => {
  it('should parse HTTPS GitHub URLs with or without .git suffix', () => {
    const res1 = RepoUrlParser.parse('https://github.com/manav193/NIMO-DECK.git');
    expect(res1).not.toBeNull();
    expect(res1?.owner).toBe('manav193');
    expect(res1?.repo).toBe('NIMO-DECK');
    expect(res1?.fullName).toBe('manav193/NIMO-DECK');

    const res2 = RepoUrlParser.parse('https://github.com/manav193/NIMO-DECK');
    expect(res2?.fullName).toBe('manav193/NIMO-DECK');
  });

  it('should parse SSH GitHub URLs', () => {
    const res = RepoUrlParser.parse('git@github.com:manav193/NIMO-DECK.git');
    expect(res).not.toBeNull();
    expect(res?.owner).toBe('manav193');
    expect(res?.repo).toBe('NIMO-DECK');
    expect(res?.httpsUrl).toBe('https://github.com/manav193/NIMO-DECK.git');
  });

  it('should return null for non-GitHub or invalid URLs', () => {
    expect(RepoUrlParser.parse('https://gitlab.com/user/project.git')).toBeNull();
    expect(RepoUrlParser.parse('/local/path/to/repo')).toBeNull();
    expect(RepoUrlParser.parse('')).toBeNull();
  });

  it('should evaluate equivalence across different protocols for the same repository', () => {
    const https = 'https://github.com/manav193/NIMO-DECK.git';
    const ssh = 'git@github.com:manav193/NIMO-DECK.git';
    const plain = 'https://github.com/manav193/NIMO-DECK';

    expect(RepoUrlParser.areEquivalent(https, ssh)).toBe(true);
    expect(RepoUrlParser.areEquivalent(ssh, plain)).toBe(true);
    expect(RepoUrlParser.areEquivalent(https, 'https://github.com/other/repo')).toBe(false);
  });
});

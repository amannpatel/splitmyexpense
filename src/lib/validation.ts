import { MAX_AMOUNT_MINOR } from './money';
import type { Participant } from './types';

export const MAX_NAME_LENGTH = 30;
export const MAX_PARTICIPANTS = 100;
export const MAX_TITLE_LENGTH = 40;

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Case- and whitespace-insensitive key used to spot accidental duplicates ("alice " === "Alice"). */
export function nameKey(name: string): string {
  return cleanName(name).toLocaleLowerCase();
}

export function findByName(participants: readonly Participant[], name: string, exceptId?: string) {
  const key = nameKey(name);
  return participants.find((p) => p.id !== exceptId && nameKey(p.name) === key);
}

export function validateName(raw: string): string | null {
  const name = cleanName(raw);
  if (!name) return 'Add a name first';
  if (name.length > MAX_NAME_LENGTH) return `Keep names under ${MAX_NAME_LENGTH} characters`;
  return null;
}

export function isValidAmountMinor(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_MINOR;
}

export function isValidParticipant(value: unknown): value is Participant {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.name === 'string' &&
    validateName(p.name) === null &&
    typeof p.avatarSeed === 'string' &&
    p.avatarSeed.length > 0 &&
    isValidAmountMinor(p.paidMinor)
  );
}

/** Returns a list of human-readable problems; an empty list means the group is safe to calculate. */
export function validateGroup(participants: readonly Participant[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  if (participants.length > MAX_PARTICIPANTS) problems.push(`A split can have at most ${MAX_PARTICIPANTS} people`);
  for (const p of participants) {
    if (!isValidParticipant(p)) {
      problems.push(`Invalid entry for "${String((p as { name?: unknown } | null)?.name)}"`);
      continue;
    }
    if (ids.has(p.id)) problems.push(`Duplicate id ${p.id}`);
    if (names.has(nameKey(p.name))) problems.push(`"${p.name}" appears more than once`);
    ids.add(p.id);
    names.add(nameKey(p.name));
  }
  return problems;
}

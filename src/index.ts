export interface PackageSummaryInput {
  name: string;
  version: string;
  description?: string;
}

export function createPackageSummary(input: PackageSummaryInput): string {
  const description = input.description?.trim() ?? 'No description provided.';

  return `${input.name}@${input.version}: ${description}`;
}

export * from './checks';
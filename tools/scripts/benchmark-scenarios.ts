/**
 * Shared scenarios for benchmark and analysis
 * This file defines the scenarios used in both benchmark and analysis scripts
 */

export interface BenchmarkScenario {
  id: string;
  name: string;
  description: string;
  expectedStatus: number;
}

export const BENCHMARK_SCENARIOS = [
  {
    id: '1-view-cat-owner',
    name: 'View Cat (Owner)',
    description: 'Cat owner views their own cat',
    expectedStatus: 200,
  },
  {
    id: '1-view-cat-sitter',
    name: 'View Cat (Sitter)',
    description: 'Cat sitter views a public cat listing',
    expectedStatus: 200,
  },
  {
    id: '2-create-sitting',
    name: 'Create Cat Sitting',
    description: 'Owner creates a cat sitting request',
    expectedStatus: 201,
  },
  {
    id: '2-view-sitting-sitter',
    name: 'View Sitting (Sitter)',
    description: 'Sitter views an assigned cat sitting',
    expectedStatus: 200,
  },
  {
    id: '2-update-sitting',
    name: 'Update Sitting',
    description: 'Sitter updates a cat sitting in pending state',
    expectedStatus: 200,
  },
  {
    id: '2-activate-sitting',
    name: 'Activate Sitting',
    description: 'Owner activates a cat sitting',
    expectedStatus: 200,
  },
  {
    id: '2-update-active-sitting',
    name: 'Update Active Sitting',
    description: 'Sitter attempts to update a cat sitting in active state (should fail)',
    expectedStatus: 403,
  },
  {
    id: '2-complete-sitting',
    name: 'Complete Sitting',
    description: 'Owner marks a cat sitting as completed',
    expectedStatus: 200,
  },
  {
    id: '3-create-review',
    name: 'Create Review',
    description: 'Owner creates a review for a completed cat sitting',
    expectedStatus: 201,
  },
  {
    id: '3-edit-review-sitter',
    name: 'Edit Review (Sitter)',
    description: 'Sitter attempts to edit a review (should fail)',
    expectedStatus: 403,
  },
  {
    id: '3-edit-review-owner',
    name: 'Edit Review (Owner)',
    description: 'Owner edits their own review',
    expectedStatus: 200,
  },
  {
    id: '3-edit-review-admin',
    name: 'Edit Review (Admin)',
    description: 'Admin edits any review',
    expectedStatus: 200,
  },
] as const satisfies readonly BenchmarkScenario[];

export function getScenarioById(id: string): BenchmarkScenario | undefined {
  return BENCHMARK_SCENARIOS.find(scenario => scenario.id === id);
}

export function getScenariosByCategory(category: string): BenchmarkScenario[] {
  return BENCHMARK_SCENARIOS.filter(scenario => scenario.id.startsWith(`${category}-`));
}

export function getScenarioName(scenarioId: string): string {
  const scenario = getScenarioById(scenarioId);
  return scenario ? scenario.name : scenarioId;
}

/**
 * Gets a more readable description of the scenario including its category/group
 */
export function getScenarioFullDescription(scenarioId: string): string {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return scenarioId;

  // Extract category from ID (e.g., "1" from "1-view-cat-owner")
  const category = scenarioId.split('-')[0];

  let categoryName = '';
  switch (category) {
    case '1':
      categoryName = 'Simple Cat Viewing';
      break;
    case '2':
      categoryName = 'Cat Sitting Management';
      break;
    case '3':
      categoryName = 'Review System';
      break;
    default:
      categoryName = 'Other';
  }

  return `${categoryName} - ${scenario.name}: ${scenario.description}`;
}

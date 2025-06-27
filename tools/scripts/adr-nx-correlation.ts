#!/usr/bin/env tsx
/**
 * ADR-Nx Correlation Tool
 * 
 * This script demonstrates how to use the Nx project metadata from ADRs
 * to create intelligent correlations in CI/CD pipelines.
 * 
 * Usage:
 * - In PR/CI: yarn tsx tools/scripts/adr-nx-correlation.ts --mode=ci
 * - Local check: yarn tsx tools/scripts/adr-nx-correlation.ts --mode=local
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ADRMetadata {
  id: string;
  title: string;
  status: string;
  impactLevel: string;
  affectedNxProjects: string[];
  filePath: string;
}

interface CorrelationResult {
  adr: ADRMetadata;
  matchType: 'direct' | 'indirect' | 'infrastructure';
  matchedProjects: string[];
  confidence: number;
}

function parseADRMetadata(adrPath: string): ADRMetadata {
  const content = readFileSync(adrPath, 'utf-8');
  const lines = content.split('\n');
  
  const metadata: Partial<ADRMetadata> = {
    filePath: adrPath
  };
  
  // Extract metadata from the file
  const titleMatch = content.match(/# ADR-(\d+): (.+)/);
  if (titleMatch) {
    metadata.id = titleMatch[1];
    metadata.title = titleMatch[2];
  }
  
  // Parse metadata section
  for (const line of lines) {
    if (line.startsWith('- **Status**:')) {
      metadata.status = line.split('**Status**:')[1].trim();
    }
    if (line.startsWith('- **Impact Level**:')) {
      metadata.impactLevel = line.split('**Impact Level**:')[1].trim();
    }
    if (line.startsWith('- **Affected Nx Projects**:')) {
      const projectsStr = line.split('**Affected Nx Projects**:')[1].trim();
      metadata.affectedNxProjects = projectsStr === 'N/A' 
        ? [] 
        : projectsStr.split(',').map(p => p.trim());
    }
  }
  
  return metadata as ADRMetadata;
}

function getAffectedNxProjects(): string[] {
  try {
    // Get affected projects from Nx
    const output = execSync('npx nx show projects --affected --base=main', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    });
    
    return output.trim().split('\n').filter(Boolean);
  } catch {
    console.warn('⚠️  Could not determine affected Nx projects. Using git diff fallback.');
    return [];
  }
}

function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only HEAD~1 HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    return output.trim().split('\n').filter(Boolean);
  } catch {
    console.warn('⚠️  Could not determine changed files.');
    return [];
  }
}

function correlateADRsWithNxProjects(
  affectedProjects: string[],
  changedFiles: string[]
): CorrelationResult[] {
  const adrDir = 'docs/decisions';
  const adrFiles = readdirSync(adrDir)
    .filter(file => file.match(/^\d{4}-.+\.md$/))
    .map(file => join(adrDir, file));
  
  const correlations: CorrelationResult[] = [];
  
  for (const adrFile of adrFiles) {
    const adr = parseADRMetadata(adrFile);
    
    // Skip if no Nx projects are affected by this ADR
    if (adr.affectedNxProjects.length === 0) {
      continue;
    }
    
    // Find direct project matches
    const directMatches = adr.affectedNxProjects.filter(project => 
      affectedProjects.includes(project)
    );
    
    if (directMatches.length > 0) {
      const confidence = calculateConfidence(directMatches.length, adr.affectedNxProjects.length);
      
      correlations.push({
        adr,
        matchType: 'direct',
        matchedProjects: directMatches,
        confidence
      });
    }
    
    // Check for indirect correlations via file patterns
    const hasIndirectMatch = changedFiles.some(file => 
      file.includes('auth') || 
      file.includes('authorization') ||
      file.includes('kratos') ||
      file.includes('openfga')
    );
    
    if (!directMatches.length && hasIndirectMatch) {
      correlations.push({
        adr,
        matchType: 'indirect',
        matchedProjects: [],
        confidence: 0.3
      });
    }
  }
  
  // Sort by confidence and impact level
  return correlations.sort((a, b) => {
    const impactWeight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    const aScore = b.confidence + (impactWeight[b.adr.impactLevel] || 0) * 0.1;
    const bScore = a.confidence + (impactWeight[a.adr.impactLevel] || 0) * 0.1;
    return aScore - bScore;
  });
}

function calculateConfidence(matches: number, total: number): number {
  return Math.min(matches / total, 1.0);
}

function generateReport(correlations: CorrelationResult[]): string {
  if (correlations.length === 0) {
    return '✅ No ADRs require review for the current changes.';
  }
  
  let report = '📋 **ADR Review Required**\n\n';
  report += 'The following architectural decisions may be affected by your changes:\n\n';
  
  for (const correlation of correlations) {
    const { adr, matchType, matchedProjects, confidence } = correlation;
    
    report += `### 🏗️ ADR-${adr.id}: ${adr.title}\n`;
    report += `- **Impact Level**: ${adr.impactLevel}\n`;
    report += `- **Match Type**: ${matchType}\n`;
    report += `- **Confidence**: ${(confidence * 100).toFixed(0)}%\n`;
    
    if (matchedProjects.length > 0) {
      report += `- **Affected Projects**: ${matchedProjects.join(', ')}\n`;
    }
    
    report += `- **Review**: [\`${adr.filePath}\`](${adr.filePath})\n\n`;
    
    // Add action items based on match type and confidence
    if (confidence > 0.7) {
      report += '**Required Actions:**\n';
      report += '- [ ] Review ADR for breaking changes\n';
      report += '- [ ] Verify implementation aligns with architectural decisions\n';
      report += '- [ ] Update tests if architectural patterns change\n\n';
    } else if (confidence > 0.3) {
      report += '**Recommended Actions:**\n';
      report += '- [ ] Quick review to ensure no conflicts\n\n';
    }
  }
  
  report += '---\n*Generated by ADR-Nx correlation analysis*\n';
  return report;
}

function main() {
  const mode = process.argv.includes('--mode=ci') ? 'ci' : 'local';
  
  console.log(`🔍 Running ADR-Nx correlation analysis (${mode} mode)...`);
  
  const affectedProjects = getAffectedNxProjects();
  const changedFiles = getChangedFiles();
  
  console.log(`📊 Found ${affectedProjects.length} affected Nx projects`);
  console.log(`📁 Found ${changedFiles.length} changed files`);
  
  if (affectedProjects.length === 0 && changedFiles.length === 0) {
    console.log('✅ No changes detected. Skipping ADR correlation.');
    process.exit(0);
  }
  
  const correlations = correlateADRsWithNxProjects(affectedProjects, changedFiles);
  const report = generateReport(correlations);
  
  console.log('\n' + report);
  
  // In CI mode, write to GitHub output for PR comments
  if (mode === 'ci' && process.env.GITHUB_OUTPUT) {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `adr_report<<EOF\n${report}\nEOF\n`);
  }
  
  // Exit with warning code if high-confidence correlations found
  const highConfidenceCount = correlations.filter(c => c.confidence > 0.7).length;
  if (highConfidenceCount > 0) {
    console.log(`⚠️  ${highConfidenceCount} high-confidence ADR correlations found.`);
    process.exit(0); // Don't fail the build, just warn
  }
}

if (require.main === module) {
  main();
}

export { correlateADRsWithNxProjects, parseADRMetadata };
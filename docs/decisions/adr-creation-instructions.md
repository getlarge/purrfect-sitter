# ADR Creation Instructions for Claude Code

## Overview
You are an assistant specialized in creating Architectural Decision Records (ADRs) for JavaScript/TypeScript monorepos using Nx. Your role is to generate comprehensive, well-structured ADRs that capture not just the decision itself, but rich contextual metadata from the project environment.

## Core Principles

1. **Context-Rich Documentation**: Every ADR should include extensive metadata about the technical environment
2. **Correlation-Friendly**: Structure ADRs to enable automated correlation with future code changes
3. **Push-Based Knowledge**: Include enough context that automated tools can surface relevant ADRs to developers
4. **Monorepo-Aware**: Leverage Nx project graph and workspace structure for enhanced context

## ADR Template Structure

Use this exact template structure for all ADRs:

```markdown
# ADR-NNNN: [Title in Present Tense Imperative]

## Metadata
- **Date**: YYYY-MM-DD
- **Status**: [Proposed | Accepted | Deprecated | Superseded by ADR-XXXX]
- **Deciders**: [@username1, @username2]
- **Technical Area**: [Frontend | Backend | DevOps | Testing | Architecture]
- **Impact Level**: [Low | Medium | High | Critical]
- **Affected Nx Projects**: [comma-separated list of Nx project names, or N/A if infrastructure-only]

## Context

### Problem Statement
[Clear description of the problem or requirement that triggered this decision]

### Technical Environment
[Automatically populated - see Technical Environment Collection section]

### Constraints and Requirements
- **Performance Requirements**: [if applicable]
- **Security Requirements**: [if applicable]
- **Compatibility Requirements**: [if applicable]
- **Resource Constraints**: [if applicable]

### Alternatives Considered
1. **Option 1**: [Description]
   - Pros: [list]
   - Cons: [list]

2. **Option 2**: [Description]
   - Pros: [list]
   - Cons: [list]

[Continue for all considered options]

Note: Do not include time estimates in ADRs unless specifically requested, as they can become outdated and are not essential for architectural decisions.

## Decision

### Chosen Solution
[Clear statement of what was decided, in active voice]

### Implementation Approach
[High-level approach for implementing the decision]

### Success Criteria
[How will we know this decision was successful?]

## Consequences

### Positive Impacts
- [Impact 1]
- [Impact 2]

### Negative Impacts
- [Impact 1]
- [Impact 2]

### Risks and Mitigation
- **Risk**: [Description]
  - **Likelihood**: [Low/Medium/High]
  - **Impact**: [Low/Medium/High]  
  - **Mitigation**: [Strategy]

### Follow-up Actions
- [ ] [Action item 1]
- [ ] [Action item 2]

## Technical Context

### Affected Components
[Automatically populated - see Component Analysis section]

### Dependencies
[Automatically populated - see Dependency Analysis section]

### Related ADRs
- **Supersedes**: [ADR-XXXX: Title]
- **Related**: [ADR-YYYY: Title]
- **Influences**: [ADR-ZZZZ: Title]

## Implementation Notes

### Code Changes Required
[List of files/directories that will need modification]

### Configuration Changes
[List of config files that will be affected]

### Testing Strategy
[How the implementation will be tested]

### Deployment Considerations
[Any deployment-specific concerns]

## References
- [Link 1: Description]
- [Link 2: Description]
- **Git References**: [Automatically populated]
- **Issue References**: [If applicable]

---
**ADR Correlation Tags**: [Automatically generated tags for correlation]
```

## Technical Environment Collection

Before writing any ADR, you must collect and analyze the following technical environment information:

### 1. Git Repository Analysis
```bash
# Repository information
git remote -v
git log --oneline -10
git status --porcelain

# Current branch and recent commits
git branch --show-current
git log --oneline --since="1 month ago" --grep="[relevant keywords]"

# Contributors information
git shortlog -sn --since="3 months ago"
```

### 2. Nx Workspace Analysis
```bash
# Workspace structure
nx show projects --type=app
nx show projects --type=lib
nx print-affected --target=build
nx graph --file=project-graph.json

# Plugin information
nx list --installed
nx list --core

# Project dependency analysis
nx graph --focus=[project-name]
nx show project [project-name] --web
```

### 3. Package.json Analysis
Analyze the following files and extract relevant information:
- `package.json` (root workspace)
- `package.json` files in affected projects
- `nx.json` configuration
- `tsconfig.json` files
- `.eslintrc.json` files

### 4. Project Dependencies
```bash
# Dependency analysis
npm ls --depth=0
npm outdated
nx graph --focus=[affected-project]
```

### 5. CI/CD Context
Analyze:
- `.github/workflows/` or `.gitlab-ci.yml`
- Docker files
- Deployment scripts
- Environment configurations

## Component Analysis Procedure

For each ADR, identify and document:

### Affected Projects
1. **Primary Projects**: Projects directly modified by this decision
2. **Secondary Projects**: Projects that depend on primary projects
3. **Infrastructure Projects**: Shared libraries, tools, configurations affected

### File Path Mapping
Create a mapping of decision impact to file paths:
```markdown
### Affected Components
#### Primary Impact
- `apps/[app-name]/` - [reason for impact]
- `libs/[lib-name]/` - [reason for impact]
- `tools/[tool-name]/` - [reason for impact]

#### Secondary Impact  
- `packages/[package-name]/` - [dependency relationship]
- Configuration files:
  - `nx.json` - [specific changes]
  - `package.json` - [dependency changes]
  - `.eslintrc.json` - [rule changes]

#### Infrastructure Impact
- CI/CD pipelines - [how they're affected]
- Build processes - [changes required]
- Testing infrastructure - [modifications needed]
```

## Dependency Analysis Procedure

### Direct Dependencies
```markdown
### Dependencies
#### Added Dependencies
- `package-name@version` - [justification]
- `dev-dependency@version` - [development purpose]

#### Removed Dependencies  
- `old-package@version` - [reason for removal]

#### Updated Dependencies
- `package-name`: `old-version` → `new-version` - [reason for update]
```

### Nx Project Dependencies
```markdown
#### Nx Project Dependencies
- **Depends On**: [list of projects this decision depends on]
- **Depended By**: [list of projects that will depend on this decision]
- **Implicit Dependencies**: [shared configurations, global tools affected]

### Nx Project Metadata Guidelines
When populating the "Affected Nx Projects" metadata field:
1. **Primary Projects**: Projects directly modified by this decision
2. **Secondary Projects**: Projects that depend on primary projects and will be affected
3. **Use Exact Names**: Use the exact project names from `nx show projects`
4. **Infrastructure-Only**: Use "N/A" for decisions that only affect infrastructure (Docker, CI/CD) without touching Nx projects
5. **Validation**: The listed projects should correlate with `nx show projects --affected` when files covered by this ADR are modified
```

## Correlation Tag Generation

Generate tags for automated correlation using this format:

```markdown
**ADR Correlation Tags**: `#area-[frontend|backend|devops]`, `#tool-[nx|webpack|jest]`, `#pattern-[microservice|monorepo|ci-cd]`, `#impact-[high|medium|low]`, `#team-[team-name]`, `#component-[specific-component]`
```

### Tag Categories:
- **Area Tags**: `#area-frontend`, `#area-backend`, `#area-devops`, `#area-testing`
- **Tool Tags**: `#tool-nx`, `#tool-webpack`, `#tool-jest`, `#tool-docker`, `#tool-kubernetes`
- **Pattern Tags**: `#pattern-microservice`, `#pattern-monorepo`, `#pattern-ci-cd`, `#pattern-security`
- **Impact Tags**: `#impact-critical`, `#impact-high`, `#impact-medium`, `#impact-low`
- **Component Tags**: `#component-[specific-app-or-lib-name]`
- **Team Tags**: `#team-[team-name]` (if known)

## File Naming Convention

ADR files must follow this exact naming pattern:
```
NNNN-verb-object-context.md
```

Examples:
- `0001-migrate-webpack-to-vite-build-system.md`
- `0002-implement-micro-frontend-architecture.md`
- `0003-adopt-nx-cloud-for-ci-optimization.md`
- `0004-standardize-eslint-configuration-across-projects.md`

## Automation Integration Points

Structure ADRs to support these automation scenarios:

### File Path Correlation
Include explicit file path patterns that tools can match:
```markdown
### File Path Patterns
- `apps/*/webpack.config.js` - [how this ADR affects these files]
- `libs/*/project.json` - [specific changes expected]
- `tools/eslint/*` - [configuration changes]
```

### Git Hook Integration
Include metadata that git hooks can parse:
```markdown
### Git Integration
- **Pre-commit Checks**: [what should be validated]
- **Pre-push Warnings**: [what developers should be reminded of]
- **Related Branches**: [if this decision spans multiple branches]
```

### MR/PR Template Integration
Provide templates for developers to reference:
```markdown
### PR/MR Template Additions
When creating PRs/MRs that relate to this ADR, include:
- [ ] Verify compliance with [specific requirement]
- [ ] Update [specific documentation]
- [ ] Test [specific scenarios]
```

## Decision Quality Checklist

Before finalizing any ADR, ensure:

### Technical Completeness
- [ ] All affected projects are identified
- [ ] Dependencies are clearly mapped
- [ ] Configuration changes are specified
- [ ] Testing approach is defined

### Context Richness
- [ ] Problem statement is clear and specific
- [ ] Alternatives are thoroughly documented
- [ ] Constraints are explicitly stated
- [ ] Success criteria are measurable

### Correlation Readiness
- [ ] File path patterns are specified
- [ ] Correlation tags are comprehensive
- [ ] Component impact is clearly mapped
- [ ] Team/ownership information is included

### Future-Proofing
- [ ] Decision can be easily superseded if needed
- [ ] Implementation can be tracked and measured
- [ ] Related decisions are clearly linked
- [ ] Follow-up actions are actionable

## Example ADR Creation Process

When asked to create an ADR, follow this process:

1. **Gather Context**: Ask for or collect technical environment information
2. **Analyze Impact**: Determine which projects, files, and teams are affected
3. **Research Alternatives**: Investigate and document different approaches
4. **Structure Decision**: Use the template to organize information clearly
5. **Generate Metadata**: Create rich correlation tags and file path mappings
6. **Validate Completeness**: Ensure all sections are meaningful and actionable

## Command Examples for Information Gathering

Use these commands to gather necessary information:

```bash
# Nx workspace analysis
nx show projects --json > workspace-projects.json
nx graph --file=project-graph.json
nx list --installed

# Git repository analysis  
git log --oneline --since="1 month ago" --pretty=format:"%h %s %an" > recent-commits.txt
git branch -r > remote-branches.txt

# Package analysis
find . -name "package.json" -not -path "*/node_modules/*" | head -20
npm ls --json --depth=0 > dependencies.json

# File structure analysis
find . -name "*.config.js" -o -name "*.config.ts" -not -path "*/node_modules/*"
find . -name "project.json" -not -path "*/node_modules/*"
```

Remember: The goal is to create ADRs that are not just documentation, but active knowledge assets that can automatically surface relevant information to developers when they need it most.
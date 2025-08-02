# Parallel Development Strategies Research

## Problem Statement

Working on multiple features simultaneously while maintaining efficient validation and testing workflows. Current challenges:
- CI feedback loops are too slow for rapid iteration
- One-size-fits-all CI pipelines don't match branch-specific needs
- Need to switch between client projects during boring validation tasks
- Require infrastructure isolation for testing but want to avoid reconciliation complexity

## Three Core Approaches Analyzed

### 1. Sub-agents
- **Best for**: Compute-intensive, parallelizable tasks within same environment
- **Use case**: Tasks that can share the same development stack
- **Limitation**: No infrastructure isolation

### 2. Git Working Trees
- **Best for**: Experimenting with different branches/features simultaneously
- **Benefits**: No context switching costs
- **Limitation**: Shared infrastructure dependencies (containers issue)

### 3. Dev Containers
- **Best for**: Infrastructure isolation with separate environments
- **Benefits**: Complete environment isolation
- **Challenge**: Reconciliation complexity between containers

## Validation Strategy by Change Type

### Pre-commit Hooks (Always Required)
- Lint, typecheck, formatting
- Use working trees with shared tooling
- Hooks run automatically in each tree's context

### Local Feature Testing (Infrastructure Dependent)
- API changes: API + DB containers only
- Worker changes: Message queue + worker, skip web services
- UI changes: Mock APIs, skip heavy backend
- Schema changes: Full stack with test data fixtures

### CI-only Validation (Simple Changes)
- Simple branch + push
- Working trees for context switching while waiting

## Advanced Solutions from Research

### Claude Code as MCP Server
- **Command**: `claude mcp serve` transforms Claude Code into an MCP (Model Context Protocol) server
- **Key capability**: Task tool spawns sub-agents with same tool access as main agent
- **Use cases**: 
  - Parallel analysis with specialized sub-agents (e.g., design, accessibility, mobile experts)
  - Complex supervisor-style problem solving
  - Context window management by delegating work to sub-agents
- **Benefits**:
  - Keeps main task focused while sub-agents handle specific concerns
  - Enables true parallel processing of different aspects
  - Results reported back to main task for synthesis
- **Integration**: Can be accessed by other Claude Code instances or MCP-compatible tools

### GitButler + Claude Code Integration
- **Revolutionary approach**: Automatic branch creation per coding session
- **Benefit**: "Write three features, get three clean branches — no conflicts, no worktrees, no hassle"
- **How it works**: Lifecycle hooks create unique branches, preserve original prompts
- **Requirements**: Newest GitButler client + Claude Code hooks

### Claude Code Hooks for Validation
Available hook types:
- `PreToolUse`: Runs before tool execution
- `PostToolUse`: Runs after tool completion
- `UserPromptSubmit`: Validates/modifies prompts
- `Notification`: Triggered by system events
- `Stop/SubagentStop`: Runs when responses complete

**Practical validation hook example:**
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|MultiEdit",
      "hooks": [{
        "type": "command", 
        "command": "yarn nx affected -t lint test --files=$CLAUDE_FILE_PATH"
      }]
    }]
  }
}
```

### Dev Containers with Security
- Custom firewall with network restrictions
- Default-deny network policy with whitelisted domains
- VS Code integration with Remote-Containers extension
- **Warning**: Only use with trusted repositories

## Recommended Hybrid Workflow

### Primary Strategy: GitButler Integration
- Eliminates worktree complexity
- Automatic branch management
- Perfect for parallel feature development

### Secondary: Claude Code MCP Server for Complex Tasks
- Use when multiple aspects need parallel analysis
- Spawn specialized sub-agents for different concerns
- Example workflow:
  ```bash
  # Terminal 1: Start Claude Code as MCP server
  claude mcp serve
  
  # Terminal 2: Connect main Claude instance and use Task tool
  # to spawn parallel sub-agents for architecture review, 
  # security audit, performance analysis, etc.
  ```

### Tertiary: Targeted Dev Containers
- Use when client isolation required
- Volume mount working trees into containers
- Docker Compose override files per feature:
  ```bash
  docker-compose -f base.yml -f feature-x.override.yml up
  ```

### Validation Layer: Claude Hooks
- Immediate feedback without CI wait
- Nx affected commands with `--files` flag for precision
- Context-aware validation based on change type

## Implementation Priority

1. **Immediate**: Set up Claude hooks for validation automation
2. **Short-term**: Implement GitButler + Claude Code integration
3. **Opportunistic**: Claude Code MCP server for complex multi-aspect analysis
4. **As-needed**: Dev containers for client work requiring isolation

## Key Insights

- Don't over-engineer validation for simple changes
- CI's one-size-fits-all approach kills productivity
- Local environment should match change scope, not entire architecture
- Nx `--files` flag provides precise affected command targeting
- GitButler eliminates traditional parallel development pain points
- Claude Code MCP server enables true parallel processing via sub-agents
- Sub-agents preserve main task's context window while handling specific concerns

## Nx-Specific Optimizations

- Use `yarn nx affected -t test --files=<changed-files>` for precise testing
- Leverage Nx's intelligent caching and dependency graph
- Tailor validation to project types (API, worker, UI)
- Working trees + shared Nx cache for optimal performance
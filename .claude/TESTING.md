# Claude Skills Testing Guide

This guide explains how to test and validate Claude Skills during development.

## Overview

Claude Skills are tested using symbolic links that allow immediate reflection of
edits across multiple test projects without code duplication.

## Test Environment Setup

### Directory Structure

```
~/kagaribi-test-projects/
├── README.md                 # Test environment overview
├── basic-test/               # Test basic workflow
│   ├── .claude -> /path/to/kagaribi/.claude  # Symlink
│   └── README.md            # Test scenarios
└── db-test/                 # Test database workflow
    ├── .claude -> /path/to/kagaribi/.claude  # Symlink
    └── README.md            # Test scenarios
```

### Creating Test Environment

The test environment has already been created at `~/kagaribi-test-projects/`.

To recreate or add new test projects:

```bash
# Create new test project directory
mkdir -p ~/kagaribi-test-projects/new-test

# Create symbolic link to Skills
cd ~/kagaribi-test-projects/new-test
ln -sf /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude .claude

# Verify symlink
ls -la .claude
# Should show: .claude -> /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude
```

## How It Works

1. **Skills Development** - Edit Skills in Kagaribi repository:
   ```bash
   cd /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude/skills/
   # Edit SKILL.md files
   ```

2. **Immediate Availability** - Changes are instantly available in all test
   projects via symbolic links

3. **Testing with Claude** - Use Claude Desktop, CLI, or IDE extension in test
   project directories

4. **Iterate** - Based on Claude's responses, refine Skills and repeat

## Test Projects

### basic-test/

Tests basic project workflow without database:
- Project initialization
- Package creation
- Inter-package RPC
- Development server
- Deployment configuration

**Skills tested:**
- `project-setup/SKILL.md`
- `development/SKILL.md`
- `deployment/SKILL.md`
- `development/references/configuration.md`

### db-test/

Tests database integration workflow:
- Project initialization with database
- Model generation
- Migration workflow
- Database queries
- Model helpers
- Transactions

**Skills tested:**
- `project-setup/SKILL.md` (database setup)
- `development/SKILL.md` (model generation)
- `development/references/database.md`
- `development/references/configuration.md`

## Testing with Claude

### Option 1: Claude Desktop App

```bash
# Navigate to test project
cd ~/kagaribi-test-projects/basic-test

# Open in file manager to drag into Claude Desktop
open .
```

Then in Claude Desktop:
- Drag test project folder into chat
- Ask Claude to perform Kagaribi tasks
- Verify Skills are referenced correctly

### Option 2: Claude Code CLI

```bash
# Navigate to test project
cd ~/kagaribi-test-projects/basic-test

# Start Claude Code session
claude-code

# Ask Claude to perform tasks
```

### Option 3: IDE Extension

```bash
# Open test project in VS Code
cd ~/kagaribi-test-projects/basic-test
code .

# Use Claude extension
# Ask Claude to perform Kagaribi tasks
```

## Test Scenarios

Detailed test scenarios are in each test project's README:
- `~/kagaribi-test-projects/basic-test/README.md`
- `~/kagaribi-test-projects/db-test/README.md`

### Quick Test Queries

Test these with Claude to validate Skills:

**Project Setup:**
```
1. "Initialize a new Kagaribi project for a blog API"
2. "Set up a Kagaribi project with PostgreSQL database"
```

**Development:**
```
3. "Create a new package called users"
4. "Generate a posts model with title and content fields"
5. "How do I make package A depend on package B?"
```

**Deployment:**
```
6. "Deploy the users package to AWS Lambda"
7. "Configure the project for different environments"
```

## Validation Checklist

When testing, verify:

- [ ] **Correct Skills Referenced** - Claude cites appropriate SKILL.md files
- [ ] **Accurate Commands** - Command syntax matches actual CLI
- [ ] **Clear Explanations** - Guidance is understandable
- [ ] **Complete Workflows** - All steps in process are covered
- [ ] **Proper References** - Links to other Skills/docs are correct
- [ ] **Error Handling** - Troubleshooting guidance provided
- [ ] **Examples Match Reality** - Code examples actually work

## Iteration Workflow

1. **Test** - Use Claude in test project
2. **Identify Issues** - Note incorrect or missing guidance
3. **Edit Skills** - Update SKILL.md files in Kagaribi repo
4. **Re-test** - Verify improvements in test project (changes are immediate)
5. **Commit** - When satisfied, commit Skills changes

## Common Issues

### Skills Not Found

**Symptom:** Claude doesn't reference Skills

**Check:**
```bash
cd ~/kagaribi-test-projects/basic-test
ls -la .claude  # Verify symlink exists
ls .claude/skills/  # Verify Skills directory accessible
```

**Fix:**
```bash
# Recreate symlink
ln -sf /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude .claude
```

### Changes Not Reflected

**Symptom:** Edited Skills not visible to Claude

**Check:**
```bash
# Verify editing correct location
cd /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude/skills/
pwd  # Should be in Kagaribi repo

# Verify symlink target
cd ~/kagaribi-test-projects/basic-test
readlink .claude  # Should show Kagaribi repo path
```

**Fix:**
- Ensure editing Skills in Kagaribi repo, not test project
- Restart Claude session if changes not detected

### Claude Doesn't Use Skills

**Symptom:** Claude answers without referencing Skills

**Possible causes:**
- Skills YAML frontmatter incorrect
- SKILL.md filename wrong
- Claude not recognizing Kagaribi context

**Fix:**
- Verify YAML frontmatter in SKILL.md files:
  ```yaml
  ---
  name: skill-name
  description: Brief description
  ---
  ```
- Ensure filename is exactly `SKILL.md` (case-sensitive)
- Mention "Kagaribi" explicitly in queries to Claude

## Best Practices

1. **Test After Each Edit** - Validate changes immediately
2. **Use Multiple Queries** - Test different phrasings of same task
3. **Check All Skills** - Ensure Skills work together cohesively
4. **Validate Examples** - Manually run commands Claude suggests
5. **Document Issues** - Keep notes on problems found
6. **Test Edge Cases** - Try unusual or complex scenarios
7. **Verify References** - Ensure cross-references between Skills work

## Example Test Session

```bash
# 1. Navigate to test project
cd ~/kagaribi-test-projects/basic-test

# 2. Start Claude Code
claude-code

# 3. Test queries
User: "Initialize a new Kagaribi project for an e-commerce API"
# Verify: Claude asks about database, deployment target
# Verify: Claude provides correct kagaribi init command
# Verify: Claude references project-setup skill

User: "Create a products package"
# Verify: Claude provides kagaribi new products command
# Verify: Claude explains package structure
# Verify: Claude references development skill

User: "How do I deploy to Cloudflare Workers?"
# Verify: Claude explains wrangler requirement
# Verify: Claude provides deployment command
# Verify: Claude references deployment skill

# 4. Exit and iterate
# Edit Skills based on findings
# Repeat test session
```

## Cleanup

To remove test projects:
```bash
rm -rf ~/kagaribi-test-projects
```

To recreate:
```bash
mkdir -p ~/kagaribi-test-projects/{basic-test,db-test}
cd ~/kagaribi-test-projects/basic-test && ln -sf /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude .claude
cd ~/kagaribi-test-projects/db-test && ln -sf /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude .claude
```

## Contributing

When developing new Skills:

1. Create Skill in `.claude/skills/` directory
2. Add test scenarios to appropriate test project README
3. Test thoroughly with Claude
4. Document any limitations or edge cases
5. Update this guide if new test patterns emerge

## Related Documentation

- Test project overview: `~/kagaribi-test-projects/README.md`
- Basic test scenarios: `~/kagaribi-test-projects/basic-test/README.md`
- Database test scenarios: `~/kagaribi-test-projects/db-test/README.md`
- Skills directory: `.claude/skills/`

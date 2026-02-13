# Claude Skills Testing - Quick Start

Get started testing Claude Skills in under 5 minutes.

## Prerequisites

- Kagaribi repository cloned at `/Users/nakatsugawa/Code/CodeRabbit/kagaribi`
- Test projects created at `~/kagaribi-test-projects/`
- Claude Desktop App, Claude Code CLI, or IDE with Claude extension

## Test Environment Status

✅ Test environment is already set up:
- `~/kagaribi-test-projects/basic-test/` - Basic workflow testing
- `~/kagaribi-test-projects/db-test/` - Database workflow testing
- Symbolic links configured to `.claude/` directory

## Quick Start: Test in 3 Steps

### Step 1: Navigate to Test Project

```bash
cd ~/kagaribi-test-projects/basic-test
```

### Step 2: Start Claude Session

**Option A: Claude Desktop**
```bash
open .  # Open in Finder, then drag folder to Claude Desktop
```

**Option B: Claude Code CLI**
```bash
claude-code
```

**Option C: VS Code Extension**
```bash
code .  # Open in VS Code, use Claude extension
```

### Step 3: Test Skills

Ask Claude:
```
Initialize a new Kagaribi project for a blog API with PostgreSQL
```

**Expected behavior:**
- Claude asks clarifying questions (database type, deployment target)
- Claude provides correct `kagaribi init` command
- Claude references `.claude/skills/project-setup/SKILL.md`
- Claude guides through post-initialization steps

## Common Test Queries

Copy and paste these into Claude to validate Skills:

### Project Setup
```
1. "Create a new Kagaribi project called my-api"
2. "Initialize a project with PostgreSQL database support"
3. "Set up a Kagaribi project for Cloudflare Workers"
```

### Package Development
```
4. "Create a users package"
5. "Create an auth package, then a posts package that depends on both auth and users"
6. "Show me how to call the users package from the posts package using RPC"
```

### Database Operations
```
7. "Generate a products model with name, price, and stock fields"
8. "How do I run database migrations?"
9. "Show me how to implement CRUD operations for posts"
```

### Deployment
```
10. "Deploy the users package to AWS Lambda"
11. "Configure different environments (development, staging, production)"
12. "What tools do I need to deploy to Cloudflare Workers?"
```

## Verify Skills Are Working

After asking Claude a query, check that:

1. **Skills Referenced** - Claude mentions specific SKILL.md files
2. **Commands Correct** - CLI commands match actual Kagaribi syntax
3. **Complete Guidance** - All steps in workflow are covered
4. **Examples Work** - Code examples are accurate and functional

## Edit and Re-test

### Make Changes

```bash
# Edit Skills in Kagaribi repository
cd /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude/skills/
vim development/SKILL.md  # Or use your editor
```

### Test Changes Immediately

Changes are instantly available in test projects via symlinks:

```bash
cd ~/kagaribi-test-projects/basic-test
# Ask Claude the same question again
# Verify improvements
```

No need to restart Claude or recreate test projects!

## Example Test Session

```bash
# 1. Navigate to test project
cd ~/kagaribi-test-projects/basic-test

# 2. Start Claude Code
claude-code

# 3. Test project initialization
User: "Initialize a new Kagaribi project for an e-commerce API"

# Claude should:
# - Ask about database requirements
# - Ask about deployment target
# - Provide: kagaribi init ecommerce-api [flags]
# - Reference: .claude/skills/project-setup/SKILL.md

# 4. Test package creation
User: "Create a products package"

# Claude should:
# - Provide: kagaribi new products
# - Explain package structure
# - Reference: .claude/skills/development/SKILL.md

# 5. Test database model
User: "Generate a products model with name, price, and description"

# Claude should:
# - Provide: kagaribi model new products name:string price:integer description:text
# - Explain migration steps
# - Reference: .claude/skills/development/references/database.md

# 6. Exit
# Ctrl+D or type "exit"
```

## Troubleshooting

### Skills Not Referenced

**Problem:** Claude answers without mentioning Skills

**Solution:**
- Mention "Kagaribi" explicitly in queries
- Check symlink: `ls -la .claude`
- Verify Skills exist: `ls .claude/skills/`

### Symlink Broken

**Problem:** `.claude` directory not accessible

**Solution:**
```bash
cd ~/kagaribi-test-projects/basic-test
rm .claude  # Remove broken link
ln -sf /Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude .claude  # Recreate
```

### Changes Not Reflected

**Problem:** Edited Skills not visible to Claude

**Solution:**
- Ensure editing in Kagaribi repo, not test project
- Restart Claude session
- Verify symlink target: `readlink .claude`

## Next Steps

### Full Test Suite

Run complete test scenarios:
- Read `~/kagaribi-test-projects/basic-test/README.md` for basic workflow tests
- Read `~/kagaribi-test-projects/db-test/README.md` for database workflow tests

### Detailed Testing Guide

See comprehensive testing documentation:
- Read `/Users/nakatsugawa/Code/CodeRabbit/kagaribi/.claude/TESTING.md`

### Validation Checklist

Use the checklist in test project READMEs to ensure all aspects are tested.

## Tips

1. **Start Simple** - Test basic queries first, then complex scenarios
2. **One Skill at a Time** - Focus on one SKILL.md file per test session
3. **Document Issues** - Keep notes on incorrect or missing guidance
4. **Test Cross-References** - Verify links between Skills work correctly
5. **Validate Examples** - Manually run commands Claude suggests
6. **Iterate Quickly** - Edit, test, refine in fast cycles

## Success Criteria

Skills are working well when:
- ✅ Claude references appropriate SKILL.md for each query type
- ✅ Command syntax matches actual Kagaribi CLI
- ✅ Workflows are complete (no missing steps)
- ✅ Examples are accurate and functional
- ✅ Cross-references between Skills work
- ✅ Troubleshooting guidance is helpful
- ✅ Claude can handle variations in how users ask questions

Happy testing! 🚀

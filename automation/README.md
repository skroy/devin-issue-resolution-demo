# Issue Triage & Auto-Resolution Tool

A Python CLI tool that fetches open GitHub issues, classifies them by priority, and optionally dispatches [Devin AI](https://devin.ai) sessions to auto-resolve them.

## Features

- **Triage dashboard** — colour-coded, priority-sorted view of every open issue.
- **Priority classification** — maps labels to priorities:
  | Label | Priority |
  |---|---|
  | `security` | CRITICAL |
  | `bug` | HIGH |
  | `performance`, `tech-debt` | MEDIUM |
  | `enhancement` | LOW |
  | `question` | INFO |
- **Auto-select modes** — `--auto all|security|bugs|top5` to skip interactive selection.
- **Dry-run mode** — `--dry-run` previews everything without creating sessions or posting comments.
- **Devin integration** — creates a Devin session per issue with a detailed resolution prompt.
- **GitHub comments** — posts a tracking comment on each dispatched issue.
- **Session polling** — monitors Devin session progress and prints status updates.

## Prerequisites

- Python 3.10+
- A GitHub personal access token with `repo` scope
- A Devin API key (only required when dispatching — not needed for `--dry-run`)

## Setup

```bash
cd automation

# Create a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GITHUB_TOKEN="ghp_your_github_token"
export DEVIN_API_KEY="your_devin_api_key"
```

## Usage

```bash
# Preview all issues in a triage dashboard (no sessions created)
python issue_resolver.py skroy/devin-issue-resolution-demo --dry-run

# Auto-dispatch all security issues
python issue_resolver.py skroy/devin-issue-resolution-demo --auto security

# Auto-dispatch all bugs (CRITICAL + HIGH)
python issue_resolver.py skroy/devin-issue-resolution-demo --auto bugs

# Auto-dispatch the top 5 highest-priority issues
python issue_resolver.py skroy/devin-issue-resolution-demo --auto top5

# Auto-dispatch every open issue
python issue_resolver.py skroy/devin-issue-resolution-demo --auto all

# Interactive mode — pick issues from the dashboard
python issue_resolver.py skroy/devin-issue-resolution-demo
```

## How It Works

1. **Fetch** — retrieves all open issues (excluding PRs) via the GitHub API.
2. **Classify** — assigns a priority to each issue based on its labels.
3. **Display** — prints a colour-coded triage dashboard sorted by priority.
4. **Select** — in `--auto` mode, filters issues automatically; otherwise prompts interactively.
5. **Dispatch** — for each selected issue:
   - Creates a Devin session (`POST /v1/sessions`) with a detailed prompt.
   - Posts a tracking comment on the GitHub issue.
   - Polls the session status and prints progress.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Always | GitHub PAT with `repo` scope |
| `DEVIN_API_KEY` | When dispatching | Devin API bearer token (not needed for `--dry-run`) |

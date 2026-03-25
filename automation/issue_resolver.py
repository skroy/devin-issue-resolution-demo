#!/usr/bin/env python3
"""
GitHub Issue Triage & Auto-Resolution Tool

Fetches open issues from a GitHub repository, classifies them by priority,
displays a triage dashboard, and optionally dispatches Devin AI sessions
to auto-resolve selected issues.

Environment variables required:
  GITHUB_TOKEN  — GitHub personal access token with repo scope
  DEVIN_API_KEY — Devin API bearer token (only needed for dispatching)
"""

import argparse
import os
import sys
import time
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GITHUB_API = "https://api.github.com"
DEVIN_API = "https://api.devin.ai/v1"

# Label → priority mapping (case-insensitive matching)
PRIORITY_MAP: dict[str, tuple[int, str]] = {
    "security":  (0, "CRITICAL"),
    "bug":       (1, "HIGH"),
    "performance": (2, "MEDIUM"),
    "tech-debt": (2, "MEDIUM"),
    "enhancement": (3, "LOW"),
    "question":  (4, "INFO"),
}

# ANSI colours for terminal output
COLORS = {
    "CRITICAL": "\033[91m",  # red
    "HIGH":     "\033[93m",  # yellow
    "MEDIUM":   "\033[96m",  # cyan
    "LOW":      "\033[92m",  # green
    "INFO":     "\033[90m",  # grey
    "RESET":    "\033[0m",
    "BOLD":     "\033[1m",
}

# Polling settings for Devin session status
POLL_INTERVAL_SECONDS = 10
MAX_POLL_ATTEMPTS = 30

# ---------------------------------------------------------------------------
# GitHub helpers
# ---------------------------------------------------------------------------


def _github_headers(token: str) -> dict[str, str]:
    """Return standard headers for GitHub API requests."""
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }


def fetch_open_issues(repo: str, token: str) -> list[dict]:
    """Fetch all open issues (excluding pull requests) from *repo*.

    Pages through the GitHub API until every open issue has been collected.
    """
    issues: list[dict] = []
    page = 1
    per_page = 100

    while True:
        url = f"{GITHUB_API}/repos/{repo}/issues"
        params = {"state": "open", "per_page": per_page, "page": page}
        resp = requests.get(url, headers=_github_headers(token), params=params)
        resp.raise_for_status()

        batch = resp.json()
        if not batch:
            break

        # The issues endpoint also returns pull requests — filter them out.
        for item in batch:
            if "pull_request" not in item:
                issues.append(item)

        if len(batch) < per_page:
            break
        page += 1

    return issues


def post_github_comment(repo: str, issue_number: int, body: str, token: str) -> None:
    """Post a comment on the given GitHub issue."""
    url = f"{GITHUB_API}/repos/{repo}/issues/{issue_number}/comments"
    resp = requests.post(url, headers=_github_headers(token), json={"body": body})
    resp.raise_for_status()


# ---------------------------------------------------------------------------
# Priority classification
# ---------------------------------------------------------------------------


def classify_issue(issue: dict) -> tuple[int, str]:
    """Return ``(rank, priority_name)`` for an issue based on its labels.

    The highest-priority (lowest rank) matching label wins.  Issues with no
    recognised labels default to ``(5, "UNCLASSIFIED")``.
    """
    best_rank = 5
    best_name = "UNCLASSIFIED"

    for label_obj in issue.get("labels", []):
        label = label_obj.get("name", "").lower().strip()
        if label in PRIORITY_MAP:
            rank, name = PRIORITY_MAP[label]
            if rank < best_rank:
                best_rank = rank
                best_name = name

    return best_rank, best_name


def sort_issues_by_priority(issues: list[dict]) -> list[tuple[dict, int, str]]:
    """Return issues sorted by priority (most critical first)."""
    classified = []
    for issue in issues:
        rank, name = classify_issue(issue)
        classified.append((issue, rank, name))
    classified.sort(key=lambda x: (x[1], x[0]["number"]))
    return classified


# ---------------------------------------------------------------------------
# Dashboard display
# ---------------------------------------------------------------------------


def _colorize(priority: str, text: str) -> str:
    """Wrap *text* in ANSI colour codes for the given priority level."""
    color = COLORS.get(priority, "")
    reset = COLORS["RESET"]
    return f"{color}{text}{reset}"


def print_dashboard(classified_issues: list[tuple[dict, int, str]]) -> None:
    """Print a formatted triage dashboard to stdout."""
    bold = COLORS["BOLD"]
    reset = COLORS["RESET"]

    print()
    print(f"{bold}{'=' * 80}{reset}")
    print(f"{bold}  ISSUE TRIAGE DASHBOARD{reset}")
    print(f"{bold}{'=' * 80}{reset}")
    print(f"  Total open issues: {len(classified_issues)}")
    print(f"{bold}{'-' * 80}{reset}")
    print(
        f"  {'#':<6} {'Priority':<14} {'Title':<40} {'Labels':<20}"
    )
    print(f"{bold}{'-' * 80}{reset}")

    for issue, _rank, priority in classified_issues:
        number = f"#{issue['number']}"
        labels = ", ".join(l["name"] for l in issue.get("labels", [])) or "—"
        title = issue["title"]
        if len(title) > 38:
            title = title[:35] + "..."
        if len(labels) > 18:
            labels = labels[:15] + "..."

        priority_display = _colorize(priority, f"{priority:<12}")
        print(f"  {number:<6} {priority_display}  {title:<40} {labels:<20}")

    print(f"{bold}{'=' * 80}{reset}")
    print()


def print_priority_summary(classified_issues: list[tuple[dict, int, str]]) -> None:
    """Print a short summary of issue counts by priority."""
    counts: dict[str, int] = {}
    for _issue, _rank, priority in classified_issues:
        counts[priority] = counts.get(priority, 0) + 1

    bold = COLORS["BOLD"]
    reset = COLORS["RESET"]
    print(f"{bold}  Priority Summary:{reset}")
    for name in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO", "UNCLASSIFIED"]:
        if name in counts:
            print(f"    {_colorize(name, name)}: {counts[name]}")
    print()


# ---------------------------------------------------------------------------
# Issue selection (interactive & auto modes)
# ---------------------------------------------------------------------------


def select_issues_auto(
    classified_issues: list[tuple[dict, int, str]], mode: str
) -> list[tuple[dict, int, str]]:
    """Return a subset of issues based on the *mode* auto-selection flag.

    Supported modes:
      all      — every open issue
      security — only CRITICAL issues
      bugs     — CRITICAL + HIGH issues
      top5     — the top 5 highest-priority issues
    """
    if mode == "all":
        return list(classified_issues)
    if mode == "security":
        return [(i, r, p) for i, r, p in classified_issues if p == "CRITICAL"]
    if mode == "bugs":
        return [(i, r, p) for i, r, p in classified_issues if p in ("CRITICAL", "HIGH")]
    if mode == "top5":
        return list(classified_issues[:5])

    print(f"Unknown --auto mode '{mode}'. Must be one of: all, security, bugs, top5")
    sys.exit(1)


def select_issues_interactive(
    classified_issues: list[tuple[dict, int, str]],
) -> list[tuple[dict, int, str]]:
    """Prompt the user to pick which issues to dispatch."""
    print("Enter issue numbers to dispatch (comma-separated), or 'q' to quit:")
    raw = input("> ").strip()
    if raw.lower() in ("q", "quit", ""):
        return []

    chosen_numbers: set[int] = set()
    for part in raw.split(","):
        part = part.strip().lstrip("#")
        if part.isdigit():
            chosen_numbers.add(int(part))

    selected = [
        (i, r, p)
        for i, r, p in classified_issues
        if i["number"] in chosen_numbers
    ]

    if not selected:
        print("No matching issues found for the given numbers.")
    return selected


# ---------------------------------------------------------------------------
# Devin API helpers
# ---------------------------------------------------------------------------


def _devin_headers(api_key: str) -> dict[str, str]:
    """Return standard headers for Devin API requests."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def build_devin_prompt(issue: dict, repo: str, priority: str) -> str:
    """Build a detailed prompt for Devin to resolve the issue."""
    labels = ", ".join(l["name"] for l in issue.get("labels", [])) or "none"
    return (
        f"Please resolve the following GitHub issue and create a pull request.\n\n"
        f"Repository: {repo}\n"
        f"Issue #{issue['number']}: {issue['title']}\n"
        f"Priority: {priority}\n"
        f"Labels: {labels}\n\n"
        f"Issue body:\n{issue.get('body') or '(no description provided)'}\n\n"
        f"Instructions:\n"
        f"1. Analyse the issue and understand the root cause.\n"
        f"2. Implement a fix or feature as described.\n"
        f"3. Follow existing code style and conventions in the repo.\n"
        f"4. Add or update tests where appropriate.\n"
        f"5. Create a pull request with a clear description linking back to issue #{issue['number']}."
    )


def create_devin_session(prompt: str, api_key: str) -> Optional[dict]:
    """Create a new Devin session via the Devin API.

    Returns the JSON response body on success, or ``None`` on failure.
    """
    url = f"{DEVIN_API}/sessions"
    payload = {"prompt": prompt}
    try:
        resp = requests.post(url, headers=_devin_headers(api_key), json=payload)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        print(f"  ✗ Failed to create Devin session: {exc}")
        return None


def poll_session_status(session_id: str, api_key: str) -> None:
    """Poll the Devin API for session status and print progress updates."""
    url = f"{DEVIN_API}/sessions/{session_id}"
    last_status = None

    for _ in range(MAX_POLL_ATTEMPTS):
        try:
            resp = requests.get(url, headers=_devin_headers(api_key))
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status", "unknown")

            if status != last_status:
                print(f"    Session {session_id}: {status}")
                last_status = status

            if status in ("finished", "stopped", "failed"):
                return
        except requests.RequestException as exc:
            print(f"    Error polling session {session_id}: {exc}")

        time.sleep(POLL_INTERVAL_SECONDS)

    print(f"    Stopped polling session {session_id} after {MAX_POLL_ATTEMPTS} attempts.")


# ---------------------------------------------------------------------------
# Dispatch workflow
# ---------------------------------------------------------------------------


def dispatch_issues(
    selected: list[tuple[dict, int, str]],
    repo: str,
    github_token: str,
    devin_api_key: str,
    dry_run: bool = False,
) -> None:
    """Dispatch selected issues to Devin for auto-resolution.

    For each issue:
      1. Build a resolution prompt.
      2. Create a Devin session (skipped in dry-run mode).
      3. Post a tracking comment on the GitHub issue.
      4. Poll the session for status updates.
    """
    bold = COLORS["BOLD"]
    reset = COLORS["RESET"]

    if not selected:
        print("No issues selected for dispatch.")
        return

    print(f"\n{bold}Dispatching {len(selected)} issue(s) to Devin...{reset}\n")

    for issue, _rank, priority in selected:
        number = issue["number"]
        title = issue["title"]
        prompt = build_devin_prompt(issue, repo, priority)

        print(f"  → #{number}: {title} [{priority}]")

        if dry_run:
            print("    [DRY RUN] Would create Devin session with prompt:")
            # Show a truncated preview of the prompt
            preview = prompt[:200].replace("\n", " ")
            print(f"    {preview}...")
            print()
            continue

        # Create a Devin session
        session_data = create_devin_session(prompt, devin_api_key)
        if session_data is None:
            print(f"    Skipping issue #{number} due to session creation failure.\n")
            continue

        session_id = session_data.get("session_id", "unknown")
        session_url = session_data.get("url", f"https://app.devin.ai/sessions/{session_id}")
        print(f"    Devin session created: {session_url}")

        # Post a tracking comment on the GitHub issue
        comment_body = (
            f"🤖 **Devin is working on this issue.**\n\n"
            f"A Devin session has been created to auto-resolve this issue.\n"
            f"Session: {session_url}\n\n"
            f"Priority: **{priority}**\n\n"
            f"_This comment was posted automatically by the issue triage tool._"
        )
        try:
            post_github_comment(repo, number, comment_body, github_token)
            print(f"    Posted tracking comment on #{number}.")
        except requests.RequestException as exc:
            print(f"    Warning: failed to post comment on #{number}: {exc}")

        # Poll for progress
        print("    Polling session status...")
        poll_session_status(session_id, devin_api_key)
        print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Triage and auto-resolve GitHub issues using the Devin API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  %(prog)s skroy/devin-issue-resolution-demo --dry-run\n"
            "  %(prog)s skroy/devin-issue-resolution-demo --auto security\n"
            "  %(prog)s skroy/devin-issue-resolution-demo --auto top5\n"
            "  %(prog)s skroy/devin-issue-resolution-demo\n"
        ),
    )
    parser.add_argument(
        "repo",
        help="GitHub repository in owner/repo format (e.g. skroy/devin-issue-resolution-demo)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview triage results without creating Devin sessions or posting comments.",
    )
    parser.add_argument(
        "--auto",
        choices=["all", "security", "bugs", "top5"],
        default=None,
        metavar="MODE",
        help=(
            "Auto-select issues to dispatch (skip interactive mode). "
            "Choices: all, security, bugs, top5."
        ),
    )
    return parser.parse_args()


def main() -> None:
    """Main entry point for the issue triage and resolution tool."""
    args = parse_args()

    # --- Validate environment variables --------------------------------
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        print("Error: GITHUB_TOKEN environment variable is not set.")
        sys.exit(1)

    devin_api_key = os.environ.get("DEVIN_API_KEY", "")
    if not devin_api_key and not args.dry_run:
        print("Error: DEVIN_API_KEY environment variable is not set.")
        print("Set it or use --dry-run to preview without dispatching.")
        sys.exit(1)

    # --- Fetch and classify issues -------------------------------------
    print(f"\nFetching open issues from {args.repo}...")
    try:
        issues = fetch_open_issues(args.repo, github_token)
    except requests.RequestException as exc:
        print(f"Error fetching issues: {exc}")
        sys.exit(1)

    if not issues:
        print("No open issues found.")
        return

    classified = sort_issues_by_priority(issues)

    # --- Display dashboard ---------------------------------------------
    print_dashboard(classified)
    print_priority_summary(classified)

    if args.dry_run:
        print("[DRY RUN] No sessions will be created.\n")

    # --- Select issues to dispatch -------------------------------------
    if args.auto:
        selected = select_issues_auto(classified, args.auto)
        print(f"Auto-selected {len(selected)} issue(s) using mode: {args.auto}\n")
    else:
        selected = select_issues_interactive(classified)

    # --- Dispatch to Devin ---------------------------------------------
    dispatch_issues(selected, args.repo, github_token, devin_api_key, dry_run=args.dry_run)

    print("Done.")


if __name__ == "__main__":
    main()

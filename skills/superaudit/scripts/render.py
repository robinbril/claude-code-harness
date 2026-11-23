#!/usr/bin/env python3
"""Build the report from the run's JSON: report.html (self-contained) and summary.md (PR body).

    render.py RUN

Verdict, counts and coverage come from the gate output, never from prose.
"""

from __future__ import annotations

import html
import sys
from collections import Counter
from pathlib import Path

import gate
from common import SEVERITIES, fail, load, save

CSS = """
:root{--bg:#fff;--fg:#1b1d22;--mut:#626873;--line:#e3e5ea;--soft:#f6f7f9;--critical:#a4001d;--high:#c2410c;--medium:#8a6100;--low:#4b5563}
@media(prefers-color-scheme:dark){:root{--bg:#15171b;--fg:#e8eaee;--mut:#9aa1ad;--line:#2d3138;--soft:#1d2025;--critical:#ff8095;--high:#ffa066;--medium:#e6c15c;--low:#aab1bd}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:1080px;margin:0 auto;padding:32px 20px 80px}h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:36px 0 10px}
.mut{color:var(--mut)}.verdict{font-size:18px;font-weight:650;margin:18px 0 6px}code{font:13px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:7px 10px;border-bottom:1px solid var(--line)}th{color:var(--mut);font-weight:550}
details{border-bottom:1px solid var(--line);padding:8px 0}summary{cursor:pointer}dl{display:grid;grid-template-columns:110px 1fr;gap:6px 14px;margin:10px 0 6px}dt{color:var(--mut)}dd{margin:0;overflow-wrap:anywhere}
.critical{color:var(--critical)}.high{color:var(--high)}.medium{color:var(--medium)}.low{color:var(--low)}.sev{font-weight:650;display:inline-block;min-width:72px}
@media(max-width:600px){dl{grid-template-columns:1fr}dt{margin-top:6px}}
"""


def optional(path: Path, default: object) -> object:
    return load(path) if path.exists() else default


def esc(value: object) -> str:
    return html.escape(str(value if value is not None else ""))


def decide(plan: dict, blockers: list[str], verified: list[dict], actions: dict[str, dict], info: dict, check: dict) -> tuple[str, str]:
    if info.get("incomplete"):
        return "INCOMPLETE", str(info["incomplete"])
    if blockers:
        return "INCOMPLETE", f"{len(blockers)} gate problems, first: {blockers[0]}"
    stand = [f for f in verified if f["decision"] in gate.OPEN and f["severity"] in ("critical", "high")
             and actions.get(f["id"], {}).get("action") != "dropped"]
    # A fix on its own branch is not in the audited head yet.
    fixed = [f for f in stand if actions.get(f["id"], {}).get("action") == "fixed"]
    open_ = [f for f in stand if f not in fixed]
    if any(f["severity"] == "critical" for f in open_):
        return "DO NOT MERGE", f"{sum(f['severity'] == 'critical' for f in open_)} open critical"
    if stand:
        return "MERGE AFTER FIXES", f"{len(open_)} open critical or high, {len(fixed)} fixed on a branch that still has to land"
    if any(x.startswith("does not merge") for x in check["facts"]):
        return "MERGE AFTER FIXES", "it does not merge into its base"
    if plan.get("fast"):
        return "INCOMPLETE", "fast run: nothing blocking found, but it was partial"
    if plan.get("not_covered_untracked"):
        return "INCOMPLETE", f"{len(plan['not_covered_untracked'])} untracked code files were not audited"
    return "MERGE", "no open critical or high finding"


def finding_html(f: dict, action: dict) -> str:
    rows = [("Location", f"<code>{esc(f['path'])}{':' + str(f['line']) if f.get('line') else ''}</code>"),
            ("Scenario", esc(f.get("scenario"))), ("Evidence", esc(f.get("evidence"))),
            ("Verdict", esc(f.get("reason"))), ("Fix", esc(f.get("fix")))]
    if f.get("options"):
        rows.append(("Options", "<br>".join(esc(o) for o in f["options"])))
    if f.get("net_lines") is not None:
        rows.append(("Net lines", esc(f["net_lines"])))
    if action:
        detail = " ".join(esc(action.get(k)) for k in ("action", "commit", "branch", "pr", "proof", "reason") if action.get(k))
        rows.append(("Action", detail))
    if f.get("reader_severity") and f["reader_severity"] != f["severity"]:
        rows.append(("Reader said", esc(f["reader_severity"])))
    body = "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in rows if v)
    return (f"<details><summary><span class='sev {esc(f['severity'])}'>{esc(f['severity'])}</span> "
            f"{esc(f['title'])} <span class='mut'>{esc(f['id'])} · {esc(f['lens'])}</span></summary><dl>{body}</dl></details>")


def main() -> int:
    if len(sys.argv) != 2:
        fail(__doc__)
    run = Path(sys.argv[1]).resolve()
    plan, grown = load(run / "plan.json"), load(run / "growth.json")
    info = optional(run / "run.json", {})
    # Recomputed here: a result file from an earlier moment never decides the verdict.
    blockers, cov = gate.coverage(run, plan)
    more, verified = gate.verdicts(run, plan)
    blockers += more
    fix_problems, done_items = gate.fixes(run, plan, verified) if any((run / "fixes").rglob("*.json")) else ([], [])
    blockers += fix_problems
    actions = {a["id"]: a for a in done_items}
    rank = {s: i for i, s in enumerate(SEVERITIES)}
    verified.sort(key=lambda f: (rank.get(f["severity"], 9), f["path"]))
    by = {d: [f for f in verified if f["decision"] == d] for d in ("confirmed", "product_decision", "needs_validation", "rejected", "duplicate_of")}
    verdict, why = decide(plan, blockers, verified, actions, info, optional(run / "prcheck.json", {"facts": []}))
    count = Counter(f["severity"] for f in by["confirmed"])
    done = Counter(a["action"] for a in actions.values())
    sprawl = [f for f in by["confirmed"] if f["lens"] == "sprawl"]
    removable = sum(min(0, f.get("net_lines") or 0) for f in sprawl)

    def section(title: str, items: list[dict]) -> str:
        return f"<h2>{title} ({len(items)})</h2>" + "".join(finding_html(f, actions.get(f["id"], {})) for f in items) if items else ""

    kinds = "".join(f"<tr><td>{esc(k)}</td><td>+{v['added']}</td><td>-{v['deleted']}</td><td>{v['net']:+d}</td></tr>" for k, v in grown["lines_by_kind"].items())
    skipped = [x for x in cov["ledger"] if x["status"] == "skipped"]
    skip_rows = "".join(f"<tr><td><code>{esc(x['path'])}</code></td><td>{esc(x['reason'])}</td></tr>" for x in skipped)
    not_verified = [*plan.get("warnings", []), *info.get("not_verified", [])]
    if plan.get("fast"):
        not_verified.insert(0, "Fast run: one reader, no specialists; critical and high only")
    if plan.get("not_covered_untracked"):
        not_verified.append(f"{len(plan['not_covered_untracked'])} untracked code files are not part of this audit")
    limits = "".join(f"<li>{esc(x)}</li>" for x in not_verified)
    prs = "".join(f"<li><a href='{esc(u)}'>{esc(u)}</a></li>" for u in info.get("prs", []) if str(u).startswith("https://"))
    rules = "".join(f"<li>{esc(x)}</li>" for x in info.get("prevention", []))
    check = optional(run / "prcheck.json", {"facts": [], "claims": []})
    texts = {c["id"]: c["text"] for c in check["claims"]}
    facts = "".join(f"<li>{esc(x)}</li>" for x in check["facts"])
    claims = "".join(f"<tr><td>{esc(c.get('status'))}</td><td>{esc(texts[i])}</td><td>{esc(c.get('why'))}</td></tr>" for i, c in cov["claims"].items() if i in texts)
    page = f"""<!doctype html><html lang="{esc(info.get('lang', 'en'))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Superaudit {esc(plan['title'])}</title><style>{CSS}</style></head><body><main>
<h1>Superaudit: {esc(plan['title'])}</h1><div class="mut"><code>{plan['merge_base'][:9]}..{plan['head'][:9]}</code> · {len(plan['files'])} files · +{plan['added']} -{plan['deleted']} · tier {plan['tier']}</div>
<div class="verdict">{verdict}</div><div>{esc(why)}</div><p>{esc(info.get('summary', ''))}</p>
<div class="wrap"><table><tr><th>Confirmed</th><th>Fixed</th><th>Product decisions</th><th>Needs validation</th><th>Rejected</th><th>Duplicates</th><th>Coverage</th></tr>
<tr><td>{' · '.join(f'<span class={s}>{s} {count[s]}</span>' for s in SEVERITIES)}</td><td>{done['fixed']}</td><td>{len(by['product_decision'])}</td><td>{len(by['needs_validation'])}</td><td>{len(by['rejected'])}</td><td>{len(by['duplicate_of'])}</td><td>{cov['reviewed']} reviewed, {cov['skipped']} skipped of {cov['total']}</td></tr></table></div>
{f'<h2>Not verified</h2><ul>{limits}</ul>' if limits else ''}{f'<h2>Pull requests</h2><ul>{prs}</ul>' if prs else ''}
{f'<h2>Merge and PR facts</h2><ul>{facts}</ul>' if facts else ''}{f'<h2>Claims of the PR text</h2><div class="wrap"><table><tr><th>Status</th><th>Claim</th><th>Why</th></tr>{claims}</table></div>' if claims else ''}
{section('Open product decisions', by['product_decision'])}{section('Confirmed', by['confirmed'])}{section('Needs validation', by['needs_validation'])}
<h2>Growth</h2><div class="wrap"><table><tr><th>Kind</th><th>Added</th><th>Deleted</th><th>Net</th></tr>{kinds}</table></div>
<p>{len(sprawl)} confirmed sprawl findings; {abs(removable)} lines can go.</p>{f'<h2>Keeps it from coming back</h2><ul>{rules}</ul>' if rules else ''}
{section('Rejected', by['rejected'])}{section('Duplicates', by['duplicate_of'])}
{f'<h2>Skipped files ({len(skipped)})</h2><div class="wrap"><table><tr><th>File</th><th>Reason</th></tr>{skip_rows}</table></div>' if skipped else ''}
</main></body></html>"""
    (run / "report.html").write_text(page, encoding="utf-8")

    def lines(items: list[dict]) -> list[str]:
        return [f"- **{f['severity']}** {f['id']} `{f['path']}{':' + str(f['line']) if f.get('line') else ''}` {f['title']}"
                + (f" ({actions[f['id']]['action']})" if f["id"] in actions else "") for f in items]

    md = [f"**Verdict: {verdict}.** {why}.", "", *([f"Not verified: {'; '.join(not_verified)}.", ""] if not_verified else []),
          f"Coverage: {cov['reviewed']} reviewed, {cov['skipped']} skipped with reason, {cov['total']} total.",
          "Confirmed: " + ", ".join(f"{s} {count[s]}" for s in SEVERITIES) + f". Fixed {done['fixed']}, rejected {len(by['rejected'])}, duplicates {len(by['duplicate_of'])}.",
          f"Growth: code {grown['lines_by_kind'].get('code', {}).get('net', 0):+d} lines net; {abs(removable)} lines can go."]
    if check["facts"]:
        md += ["", "### Merge and PR facts", *(f"- {x}" for x in check["facts"])]
    for title, key in (("Open product decisions", "product_decision"), ("Confirmed", "confirmed"), ("Needs validation", "needs_validation")):
        if by[key]:
            md += ["", f"### {title}", *lines(by[key])]
    (run / "summary.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    save(run / "verdict.json", {"verdict": verdict, "why": why, "confirmed": dict(count), "actions": dict(done)})
    print(f"{verdict}: {why}\n{run / 'report.html'}\n{run / 'summary.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

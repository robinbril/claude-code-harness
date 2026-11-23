#!/usr/bin/env python3
"""Tests on throwaway repositories. Run: python3 -B scripts/test_superaudit.py"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV = {**os.environ, "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
       "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.invalid", "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.invalid"}


class Case(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name).resolve()
        ENV["TMPDIR"] = str(self.home / "t")
        (self.home / "t").mkdir()
        self.repo, self.run_dir = self.home / "repo", self.home / "run"
        self.repo.mkdir()
        self.git("init", "-q", "-b", "main")
        self.write("app/a.py", "def keep():\n    return 1\n")
        self.write("app/old.py", "".join(f"line_{i} = {i}\n" for i in range(30)))
        self.write("app/gone.py", "x = 1\n")
        self.commit("base")
        self.git("switch", "-q", "-c", "work")

    def git(self, *args: str, cwd: Path | None = None) -> str:
        return subprocess.run(["git", *args], cwd=cwd or self.repo, env=ENV, check=True, capture_output=True, text=True).stdout.strip()

    def write(self, rel: str, text: str) -> None:
        path = self.repo / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def commit(self, message: str) -> str:
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)
        return self.git("rev-parse", "HEAD")

    def script(self, name: str, *args: str) -> tuple[int, str]:
        out = subprocess.run([sys.executable, "-B", str(HERE / name), *args], cwd=self.repo, env=ENV, capture_output=True, text=True)
        self.assertNotIn("Traceback", out.stderr, out.stderr)
        return out.returncode, out.stdout + out.stderr

    def plan(self, *args: str) -> dict:
        code, out = self.script("plan.py", *(args or ("main...work",)), "--run", str(self.run_dir))
        self.assertEqual(code, 0, out)
        self.out = out
        return json.loads((self.run_dir / "plan.json").read_text(encoding="utf-8"))

    def put(self, rel: str, data: object) -> None:
        path = self.run_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data))

    def read_all(self, plan: dict, findings: list[dict] = ()) -> None:
        for n, part in enumerate(plan["areas"] + plan["specialists"]):
            self.put(f"findings/{part['id']}.json", {"area": part["id"], "findings": list(findings) if n == 0 else [],
                                                     "files": [{"path": p, "status": "reviewed"} for p in part["files"]]})

    def finding(self, **over: object) -> dict:
        return {"id": "A1-01", "lens": "correctness", "severity": "critical", "path": "app/a.py", "line": 1, "title": "t",
                "scenario": "s", "evidence": "e", "refutation_tried": "r", "fix": "f", **over}

    def judge(self, **over: object) -> None:
        self.assertEqual(self.gate("packets")[0], 0)
        for p in sorted((self.run_dir / "packets").glob("*.json")):
            votes = [{"id": f["id"], "key": f["key"], "decision": "confirmed", "severity": f["severity"], "reason": "r", **over}
                     for f in json.loads(p.read_text())["findings"]]
            self.put(f"verdicts/{p.name}", {"verdicts": votes})

    def gate(self, step: str) -> tuple[int, str]:
        return self.script("gate.py", step, str(self.run_dir))

    def verdict(self) -> str:
        code, out = self.script("render.py", str(self.run_dir))
        self.assertEqual(code, 0, out)
        return json.loads((self.run_dir / "verdict.json").read_text())["verdict"]

    def change(self) -> None:
        self.write("app/a.py", "def keep():\n    return 2\n")
        self.commit("change")


class Plan(Case):
    def test_odd_files_stay_in_the_ledger(self) -> None:
        self.git("mv", "app/old.py", "app/new name é.py")
        (self.repo / "app/gone.py").unlink()
        self.write('app/quo"te.py', "password = check(login)\n")
        self.write("app/cr.py", "a = 1\rdiff --git a/x b/x\n")
        (self.repo / "app/a.py").chmod(0o755)
        (self.repo / "bin.dat").write_bytes(b"\0\1\2")
        self.commit("odd")
        self.git("config", "diff.noprefix", "true")
        self.git("config", "diff.external", "false")
        plan = self.plan()
        self.assertEqual({f["path"]: f["status"] for f in plan["files"]},
                         {"app/new name é.py": "R", "app/gone.py": "D", 'app/quo"te.py': "A", "app/cr.py": "A", "app/a.py": "M", "bin.dat": "A"})
        quoted = next(f for f in plan["files"] if '"' in f["path"])
        self.assertIn("auth", quoted["risk"])
        self.assertTrue(all(f.get("area") for f in plan["files"] if f["path"] != "bin.dat"))

    def test_vendor_and_svg_are_read_unless_declared(self) -> None:
        self.write("api/vendor/auth.py", "eval(p)\n")
        self.write("icon.svg", "<svg onload='x'/>\n")
        self.write("gen/api.ts", "export const x = 1\n")
        self.write(".gitattributes", "gen/** linguist-generated\n")
        self.commit("v")
        kinds = {f["path"]: f["kind"] for f in self.plan()["files"]}
        self.assertEqual((kinds["api/vendor/auth.py"], kinds["icon.svg"], kinds["gen/api.ts"]), ("code", "style", "generated"))
        self.assertIn("SKIPPED", self.out)

    def test_one_dangerous_line_and_a_removed_check_get_a_hunter(self) -> None:
        self.write("app/a.py", "def keep():\n    return eval(q)\n")
        self.commit("sink")
        self.assertIn("security", self.plan()["areas"][0]["duties"])
        self.git("switch", "-q", "main")
        self.write("app/r.py", "check_permission(x)\nv = 1\n")
        self.commit("guard")
        self.git("switch", "-q", "-c", "drop")
        self.write("app/r.py", "v = 1\n")
        self.commit("dropped")
        self.run_dir = self.home / "run2"
        self.assertIn("security", self.plan("main...drop")["areas"][0]["duties"])
        for i in range(30):
            self.write(f"pkg/m{i}.py", "".join(f"v{j} = check_permission({j})\n" for j in range(60)))
        self.commit("larger")
        self.run_dir = self.home / "run4"
        plan = self.plan("main...drop")
        self.assertEqual((plan["tier"], [s["id"] for s in plan["specialists"]]), ("M", ["S-identity", "W-sprawl"]))
        self.assertEqual(plan["areas"][0]["duties"], [])

    def test_dirty_work_is_audited_and_left_alone(self) -> None:
        self.change()
        self.write("app/a.py", "def keep():\n    return 3\n")
        self.write("app/new.py", "y = 1\n")
        before = self.git("status", "--porcelain")
        plan = self.plan("", "--base", "main")
        self.assertIn("return 3", (Path(plan["tree"]) / "app/a.py").read_text())
        self.assertEqual(plan["not_covered_untracked"], ["app/new.py"])
        self.assertEqual(self.git("status", "--porcelain"), before)
        self.assertEqual(self.git("stash", "list"), "")

    def test_stale_tree_empty_diff_and_diverged_branch(self) -> None:
        code, out = self.script("plan.py", "main...work", "--run", str(self.run_dir))
        self.assertEqual((code, "empty diff" in out), (2, True))
        self.change()
        self.plan()
        self.write("app/a.py", "z = 9\n")
        self.commit("more")
        code, out = self.script("plan.py", "main...work", "--run", str(self.run_dir))
        self.assertEqual((code, "another commit" in out), (2, True))
        self.git("clone", "-q", "--bare", str(self.repo), str(self.home / "origin.git"))
        self.git("remote", "add", "origin", str(self.home / "origin.git"))
        self.git("commit", "-q", "--amend", "-m", "other")
        self.run_dir = self.home / "run3"
        self.plan("work", "--base", "main")
        self.assertIn("diverged", self.out)

    def test_path_audit_and_private_ignore_rule(self) -> None:
        code, out = self.script("plan.py", "app")
        self.assertEqual(code, 0, out)
        self.assertIn("/.harness/superaudit/", (self.repo / ".git/info/exclude").read_text())
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_growth_leads(self) -> None:
        self.write("app/a.py", "def keep():\n    return 1\n\n\ndef render_unused_invoice():\n    return 2\n")
        self.write("app/b.py", "def hash_token():\n    return 1\n\n\nhash_token()\n")
        self.write("app/c.py", "def hash_token():\n    return 2\n\n\nhash_token()\n")
        self.commit("grow")
        self.plan()
        grown = json.loads((self.run_dir / "growth.json").read_text())
        self.assertEqual([u["name"] for u in grown["unreferenced_new_symbols"]], ["render_unused_invoice"])
        self.assertEqual([r["name"] for r in grown["same_name_in_several_files"]], ["hash_token"])

    def test_max_readers(self) -> None:
        for i in range(40):
            self.write(f"pkg{i}/m.py", "".join(f"v{j} = {j}\n" for j in range(400)))
        self.commit("many")
        self.assertLessEqual(len(self.plan("main...work", "--max-readers", "5")["areas"]), 5)
        self.write("tests/test_x.py", "x = 1\n")
        self.write("docs/x.md", "x\n")
        self.commit("kinds")
        self.run_dir = self.home / "run2"
        self.assertLessEqual(len(self.plan("main...work", "--max-readers", "2")["areas"]), 2)


    def test_small_change_has_one_reader_and_ui_is_used_only_when_possible(self) -> None:
        self.write("web/App.vue", "<template><p>hi</p></template>\n")
        self.commit("ui")
        plan = self.plan()
        self.assertEqual((len(plan["areas"]), plan["specialists"], plan["areas"][0]["duties"]), (1, [], ["sprawl"]))
        self.assertIn("nobody used the screens", self.out)
        self.write("e2e.config.ts", "export default {}\n")
        self.commit("config")
        self.run_dir = self.home / "run2"
        plan = self.plan()
        self.assertTrue([s["id"] for s in plan["specialists"]] == ["U-ui"] or "too busy" in self.out)

    def test_lessons_name_earlier_findings_and_fixes(self) -> None:
        self.git("switch", "-q", "main")
        self.write("app/a.py", "def keep():\n    return 7\n")
        self.commit("fix: keep returns the right number")
        self.git("switch", "-q", "-c", "next")
        self.write("app/a.py", "def keep():\n    return 8\n")
        self.commit("change")
        self.run_dir = self.home / "runs" / "one"
        self.read_all(self.plan("main...next"), [self.finding(title="keep loses its guard"), self.finding(id="A1-02", line=2, title="false alarm")])
        self.judge()
        data = json.loads((self.run_dir / "verdicts/V1.json").read_text())
        data["verdicts"][1].update(decision="rejected")
        self.put("verdicts/V1.json", data)
        rejected = data["verdicts"][1]["id"]
        self.run_dir = self.home / "runs" / "two"
        self.plan("main...next")
        text = (self.run_dir / "lessons.md").read_text()
        self.assertIn("keep returns the right number", text)
        real, _, wrong = text.partition("## Rejected before")
        self.assertIn("false alarm" if rejected == "A1-02" else "keep loses its guard", wrong)
        self.assertIn("keep loses its guard" if rejected == "A1-02" else "false alarm", real)


class Reviewers(Case):
    """What human reviewers kept asking; see prcheck.py and revertcheck.py."""

    def test_conflict_with_the_base_blocks_a_merge(self) -> None:
        self.change()
        self.git("switch", "-q", "main")
        self.write("app/a.py", "def keep():\n    return 5\n")
        self.commit("other")
        self.git("switch", "-q", "work")
        plan = self.plan("work", "--base", "main")
        self.assertIn("does not merge into", self.out)
        self.read_all(plan)
        self.assertEqual(self.verdict(), "MERGE AFTER FIXES")

    def test_new_skips_and_signatures_are_seen(self) -> None:
        self.write("tests/test_a.py", "import pytest\n\n\n@pytest.mark.skip\ndef test_x():\n    pass\n")
        self.write("app/a.py", "def keep(deal):\n    return 2\n")
        self.commit("skip")
        self.plan()
        self.assertIn("adds a skip or exception: tests/test_a.py", self.out)
        sys.path.insert(0, str(HERE))
        import prcheck
        plus, minus = prcheck.sides(self.repo, "main", "work")
        names = prcheck.changed_signatures(plus, minus)
        self.assertEqual(names, {"keep"})
        self.assertEqual(prcheck.calls(names, {"x.py": ["    keep(deal.id)"]}), {"keep"})

    def test_claims_need_a_status(self) -> None:
        sys.path.insert(0, str(HERE))
        import prcheck
        found = prcheck.claims("## Why\nSmall.\n\nNothing visible for users. 104 tests passed on this head.\n- Merge order: Independent of the other branches.\n")
        self.assertEqual([c["id"] for c in found], ["C1", "C2", "C3"])
        self.change()
        plan = self.plan()
        self.read_all(plan)
        self.put("prcheck.json", {"facts": [], "claims": found})
        self.assertEqual(self.verdict(), "INCOMPLETE")
        data = json.loads((self.run_dir / "findings/A1.json").read_text())
        data["claims"] = [{"id": c["id"], "status": "true", "why": "x"} for c in found]
        self.put("findings/A1.json", data)
        self.assertEqual(self.verdict(), "MERGE")

    def test_review_points_are_split_and_matched(self) -> None:
        sys.path.insert(0, str(HERE))
        import reviews
        body = "Requesting changes.\n\n1. **The seed rewrites rows.** `app/a.py:3` overwrites.\n2. No test for expiry.\n"
        self.assertEqual(len(reviews.points(body)), 2)
        runs = self.home / "runs"
        runs.mkdir()
        reviews.cache_file(runs / "one", self.repo).write_text(json.dumps([{"pr": 7, "point": "a.py overwrites", "files": ["app/a.py"]}, {"pr": 8, "point": "other", "files": ["x/y.py"]}]))
        self.assertEqual(reviews.near(runs / "one", self.repo, {"app/a.py"}), ["- PR 7: a.py overwrites"])

    def test_revertcheck_names_the_hunk_that_no_test_notices(self) -> None:
        self.git("switch", "-q", "main")
        self.write("app/two.py", "def one():\n    return 1\n" + "\n" * 12 + "def two():\n    return 2\n")
        self.write("check.sh", "grep -q 'return 10' app/two.py\n")
        self.commit("two")
        self.git("switch", "-q", "-c", "both")
        self.write("app/two.py", "def one():\n    return 10\n" + "\n" * 12 + "def two():\n    return 20\n")
        self.commit("both")
        self.plan("main...both")
        code, out = self.script("revertcheck.py", str(self.run_dir), "--", "/bin/sh", "check.sh")
        if "no sandbox" in out or "exit 3" in out:
            self.skipTest("no sandbox")
        self.assertEqual(code, 0, out)
        found = json.loads((self.run_dir / "revertcheck.json").read_text())
        self.assertEqual((found["tried"], len(found["unnoticed"])), (2, 1))
        self.assertGreater(found["unnoticed"][0]["line"], 5)


class Router(Case):
    def ctx(self, *args: str) -> tuple[int, str]:
        return self.script("ctx.py", str(self.run_dir), *args)

    def setUp(self) -> None:
        super().setUp()
        self.git("switch", "-q", "main")
        self.write("app/big.py", "".join(f"def f{i}(x):\n    return x + {i}\n\n\n" for i in range(200)) + "def target(x):\n    y = x\n    return y\n")
        self.write("app/user.py", "from app.big import target\n\n\ndef call():\n    return target(1)\n")
        self.write("tests/test_big.py", "from app.big import target\n\n\ndef test_target():\n    assert target(1) == 1\n")
        self.commit("big")
        self.git("switch", "-q", "-c", "edit")
        big = (self.repo / "app/big.py").read_text()
        self.write("app/big.py", big.replace("    y = x\n", "    y = check_permission(x)\n"))
        self.commit("edit")
        self.data = self.plan("main...edit")

    def test_pack_holds_the_changed_function_and_not_the_file(self) -> None:
        code, out = self.ctx("A1", "start")
        self.assertEqual(code, 0, out)
        self.assertIn("+    y = check_permission(x)", out)
        self.assertIn("def target(x):", out)
        self.assertNotIn("def f10(x):", out)
        for part in ("## core", "## sec-method", "## sprawl\n", "RUN/findings/<ID>.json`: `{", "DUTIES"):
            self.assertIn(part, out)
        self.assertNotIn("## migration", out)
        self.assertLess(len(out), 30_000)

    def test_lines_are_sent_once_and_searches_are_small(self) -> None:
        self.ctx("A1", "start")
        self.assertIn("already above", self.ctx("A1", "show", "app/big.py:801-803")[1])
        self.assertIn("def f10(x):", self.ctx("A1", "def", "f10")[1])
        uses, tests = self.ctx("A1", "uses", "target")[1], self.ctx("A1", "tests", "target")[1]
        self.assertTrue("app/user.py" in uses and "tests/test_big.py" not in uses and "tests/test_big.py" in tests)
        self.assertIn("y = x", self.ctx("A1", "base", "app/big.py:801-803")[1])

    def test_a_cut_answer_leaves_the_rest_to_ask_for(self) -> None:
        self.write("app/wide.py", "".join(f"v{i} = '{'x' * 90}'\n" for i in range(200)))
        self.commit("wide")
        self.run_dir = self.home / "run2"
        self.plan("main...edit")
        out = self.ctx("T9", "show", "app/wide.py:1-200")[1]
        self.assertIn("cut at line", out)
        first = int(out.split("cut at line ")[1].split(":")[0])
        self.assertIn(f"v{first - 1} =", self.ctx("T9", "show", f"app/wide.py:{first}-200")[1])

    def test_keys_never_reach_an_agent(self) -> None:
        body = "\n".join("Ab1/" * 16 for _ in range(3))
        token = "gh" + "p_" + "a1" * 20
        kind = "RSA " + "PRIVATE"
        self.write("app/k.py", f"t = '{token}'\nk = '''-----BEGIN {kind} KEY-----\n{body}\n-----END {kind} KEY-----'''\n")
        self.commit("k")
        self.run_dir = self.home / "run2"
        self.plan("main...edit")
        seen = self.ctx("A1", "start")[1] + self.ctx("B1", "show", "app/k.py:1-6")[1] + self.ctx("B1", "grep", "ghp_")[1] + self.ctx("B1", "show", "app/k.py:4-4")[1]
        self.assertIn("[key]", seen)
        self.assertFalse(token in seen or "Ab1/Ab1/" in seen)
        self.assertIn("SECRETS?", self.out)

    def test_tests_are_found_behind_many_uses(self) -> None:
        self.write("app/many.py", "target\n" * 500)
        self.run_dir = self.home / "run2"
        self.commit("many")
        self.plan("main...edit")
        self.assertIn("tests/test_big.py", self.ctx("A1", "tests", "target")[1])

    def test_budget_asks_why_and_then_stops(self) -> None:
        self.ctx("A1", "start")
        path = self.run_dir / "ctx/A1.json"
        state = json.loads(path.read_text())
        path.write_text(json.dumps({**state, "used": 100_000}))
        self.assertEqual(self.ctx("A1", "grep", "target")[0], 1)
        self.assertEqual(self.ctx("A1", "grep", "target", "--why", "refutes A1-01")[0], 0)
        path.write_text(json.dumps({**state, "used": 900_000}))
        self.assertEqual(self.ctx("A1", "grep", "target", "--why", "refutes A1-01")[0], 1)

    def test_verifier_pack_brings_the_code_after_clean(self) -> None:
        self.read_all(self.data, [self.finding(path="app/big.py", line=802)])
        self.assertEqual(self.gate("packets")[0], 0)
        self.gate("clean")
        out = self.ctx("V1", "start")[1]
        self.assertTrue("check_permission" in out and '"key"' in out and "## Verifier" not in out and "try to prove that" in out)

    def test_every_card_has_a_rule_and_is_reachable(self) -> None:
        for card in (HERE.parent / "references/cards").glob("*.md"):
            first, _, body = card.read_text().partition("\n")
            self.assertRegex(first, r"^when: (always|ask|((risk|kind|suffix|lead|duty):[\w.,-]+ ?)+)$", card.name)
            self.assertGreater(len(body), 100, card.name)


class Sandbox(Case):
    def box(self, *args: str) -> tuple[int, str]:
        return self.script("sandbox.py", str(self.run_dir), *args)

    def setUp(self) -> None:
        super().setUp()
        self.change()
        self.plan()
        if self.box("--", "/usr/bin/true")[0] == 3:
            self.skipTest("no sandbox on this machine")

    def test_runs_head_base_and_overlay(self) -> None:
        self.assertIn("return 2", self.box("--", "/bin/cat", "app/a.py")[1])
        self.assertIn("return 1", self.box("--base", "--", "/bin/cat", "app/a.py")[1])
        (self.home / "over/app").mkdir(parents=True)
        (self.home / "over/app/a.py").write_text("patched\n")
        self.assertIn("patched", self.box("--overlay", str(self.home / "over"), "--", "/bin/cat", "app/a.py")[1])

    def test_no_network_no_secrets_no_outside_writes(self) -> None:
        secret = self.home / "secret.txt"
        secret.write_text("readable outside\n")
        for command in (f"cat {secret}", f"echo x > {self.repo}/evil", "echo x > /private/tmp/superaudit-evil", f"cat {Path.home()}/.zshrc",
                        f"cat {Path.home()}/.ssh/*", "exec 3<>/dev/tcp/1.1.1.1/53", "/usr/bin/security list-keychains -d user && /usr/bin/security dump-keychain"):
            with self.subTest(command):
                self.assertNotEqual(self.box("--", "/bin/bash", "-c", command)[0], 0)
        self.assertFalse((self.repo / "evil").exists() or Path("/private/tmp/superaudit-evil").exists())
        self.assertNotIn("GIT_AUTHOR_NAME", self.box("--", "/usr/bin/env")[1])

    def test_signals_stay_inside(self) -> None:
        other = subprocess.Popen(["/bin/sleep", "60"])
        self.addCleanup(other.wait)
        self.addCleanup(other.kill)
        self.assertNotEqual(self.box("--", "/bin/bash", "-c", f"kill -9 {other.pid}")[0], 0)
        self.assertIsNone(other.poll())
        self.assertEqual(self.box("--", "/bin/bash", "-c", "/bin/sleep 30 & kill -9 $!")[0], 0)

    def test_copy_is_the_committed_tree(self) -> None:
        self.write(".gitattributes", "tests export-ignore\napp/*.py export-subst\n")
        self.write("tests/test_a.py", "x = 1\n")
        self.write("app/sub.py", "v = '$Format:%H$'\n")
        self.commit("attributes")
        self.run_dir = self.home / "run2"
        self.plan()
        self.assertEqual(self.box("--", "/bin/cat", "tests/test_a.py")[0], 0)
        self.assertIn("$Format:%H$", self.box("--", "/bin/cat", "app/sub.py")[1])

    def test_timeout_and_exit_code(self) -> None:
        self.assertEqual(self.box("--seconds", "2", "--", "/bin/sleep", "30")[0], 124)
        self.assertEqual(self.box("--", "/bin/bash", "-c", "exit 7")[0], 7)


class Gates(Case):
    def test_clean_run_merges(self) -> None:
        self.change()
        self.read_all(self.plan())
        self.assertEqual(self.verdict(), "MERGE")

    def test_nothing_read_is_incomplete(self) -> None:
        self.change()
        plan = self.plan()
        self.assertEqual(self.verdict(), "INCOMPLETE")
        self.read_all(plan)
        self.put("findings/A1.json", {"findings": [], "files": []})
        self.assertEqual(self.gate("coverage")[0], 1)
        self.put("findings/A1.json", {"findings": [], "files": [{"path": "app/a.py", "status": "skipped", "reason": "no time"}]})
        self.assertEqual(self.verdict(), "INCOMPLETE")

    def test_bad_citations_are_refused(self) -> None:
        self.change()
        plan = self.plan()
        for over in ({"line": "1"}, {"line": 3}, {"line": 999}, {"line": None}, {"path": "../../../etc/hosts"}, {"path": "nope.py"},
                     {"net_lines": "-12"}, {"lens": "sprawl"}, {"scenario": ""}, {"carried": True, "line": 999}):
            with self.subTest(over):
                self.read_all(plan, [self.finding(**over)])
                self.assertEqual(self.gate("packets")[0], 1)

    def test_deleted_file_and_old_name_can_be_cited(self) -> None:
        self.git("mv", "app/old.py", "app/new.py")
        (self.repo / "app/gone.py").unlink()
        self.commit("x")
        self.read_all(self.plan(), [self.finding(path="app/gone.py", line=None), self.finding(id="A1-02", path="app/old.py", line=None)])
        self.assertEqual(self.gate("packets")[0], 0)

    def test_reused_id_does_not_inherit_a_verdict(self) -> None:
        self.change()
        plan = self.plan()
        self.read_all(plan, [self.finding(severity="low")])
        self.judge(decision="rejected")
        self.assertEqual(self.verdict(), "MERGE")
        self.read_all(plan, [self.finding(title="something else")])
        self.assertEqual(self.gate("packets")[0], 1)
        self.assertEqual(self.verdict(), "INCOMPLETE")

    def test_late_finding_reopens_the_run(self) -> None:
        self.change()
        self.read_all(self.plan(), [self.finding(severity="low")])
        self.judge()
        self.assertEqual(self.verdict(), "MERGE")
        self.put("findings/G1.json", {"findings": [self.finding(id="G1-01")], "files": []})
        self.assertEqual(self.verdict(), "INCOMPLETE")
        self.judge_only_new()
        self.assertEqual(self.verdict(), "DO NOT MERGE")

    def judge_only_new(self) -> None:
        self.assertEqual(self.gate("packets")[0], 0)
        for p in sorted((self.run_dir / "packets").glob("*.json")):
            if not (self.run_dir / "verdicts" / p.name).exists():
                f = json.loads(p.read_text())["findings"][0]
                self.put(f"verdicts/{p.name}", {"verdicts": [{"id": f["id"], "key": f["key"], "decision": "confirmed", "severity": "critical", "reason": "r"}]})

    def test_an_invalid_verdict_goes_to_a_new_verifier(self) -> None:
        self.change()
        self.read_all(self.plan(), [self.finding()])
        self.judge(reason=" ")
        self.assertIn("run packets", self.gate("verdicts")[1])
        self.judge_only_new()
        self.assertEqual(self.gate("verdicts")[0], 0)
        self.assertTrue((self.run_dir / "verdicts/V2.json").exists())

    def test_a_verdict_cannot_move_the_citation(self) -> None:
        self.change()
        self.read_all(self.plan(), [self.finding()])
        self.judge(path="missing.py", title="other")
        self.assertEqual(self.gate("verdicts")[0], 0)
        f = json.loads((self.run_dir / "verified.json").read_text())
        f = (f["findings"] if isinstance(f, dict) else f)[0]
        self.assertEqual((f["path"], f["title"]), ("app/a.py", "t"))

    def test_a_broken_render_leaves_no_verdict(self) -> None:
        self.change()
        self.read_all(self.plan())
        self.assertEqual(self.verdict(), "MERGE")
        (self.run_dir / "findings/A1.json").write_text("{")
        self.assertNotEqual(self.script("render.py", str(self.run_dir))[0], 0)
        self.assertFalse((self.run_dir / "verdict.json").exists())

    def test_open_critical_of_any_kind_blocks(self) -> None:
        self.change()
        plan = self.plan()
        self.read_all(plan, [self.finding()])
        for over, want in (({}, "DO NOT MERGE"), ({"severity": "high"}, "MERGE AFTER FIXES"), ({"severity": "low"}, "MERGE"),
                           ({"decision": "needs_validation"}, "DO NOT MERGE"), ({"decision": "needs_validation", "severity": "none"}, "INCOMPLETE"),
                           ({"decision": "product_decision", "options": ["a", "b"]}, "DO NOT MERGE"), ({"decision": "product_decision"}, "INCOMPLETE"), ({"decision": "product_decision", "options": "ab"}, "INCOMPLETE"),
                           ({"decision": "duplicate_of", "duplicate_of": "A1-01"}, "INCOMPLETE"), ({"duplicate_of": "A1-09"}, "INCOMPLETE")):
            with self.subTest(over):
                for p in (self.run_dir / "verdicts").glob("*.json"):
                    p.unlink()
                self.judge(**over)
                self.assertEqual(self.verdict(), want)

    def test_duplicate_of_a_rejected_finding_is_refused(self) -> None:
        self.change()
        self.read_all(self.plan(), [self.finding(), self.finding(id="A1-02", severity="low", line=2)])
        self.judge(decision="rejected")
        data = json.loads((self.run_dir / "verdicts/V1.json").read_text())
        for v in data["verdicts"]:
            if v["id"] == "A1-01":
                v.update(decision="duplicate_of", duplicate_of="A1-02")
        self.put("verdicts/V1.json", data)
        self.assertEqual(self.gate("verdicts")[0], 1)
        self.assertEqual(self.verdict(), "INCOMPLETE")

    def test_fix_must_be_a_new_commit_and_still_has_to_land(self) -> None:
        self.change()
        self.read_all(self.plan(), [self.finding()])
        self.judge()
        item = {"id": "A1-01", "action": "fixed", "proof": "red then green"}
        for commit in ("main", self.git("rev-parse", "main"), "deadbeef1"):
            self.put("fixes/fix/sec.json", {"items": [{**item, "commit": commit}]})
            self.assertEqual(self.gate("fixes")[0], 1, commit)
        self.git("switch", "-q", "-c", "fix/sec")
        self.write("app/a.py", "def keep():\n    return 1\n")
        self.put("fixes/fix/sec.json", {"items": [{**item, "commit": self.commit("fix")}]})
        self.assertEqual(self.gate("fixes")[0], 0)
        self.assertEqual(self.verdict(), "MERGE AFTER FIXES")
        self.put("fixes/fix/sec.json", {"items": [{"id": "A1-01", "action": "dropped", "reason": "no"}]})
        self.assertEqual(self.gate("fixes")[0], 1)

    def test_fast_and_untracked_never_merge(self) -> None:
        self.change()
        self.read_all(self.plan("main...work", "--fast"))
        self.assertEqual(self.verdict(), "INCOMPLETE")
        self.run_dir = self.home / "run2"
        self.write("app/extra.py", "q = 1\n")
        self.read_all(self.plan("", "--base", "main"))
        self.assertEqual(self.verdict(), "INCOMPLETE")

    def test_recheck_carries_open_findings(self) -> None:
        self.change()
        self.read_all(self.plan("work", "--base", "main"), [self.finding()])
        self.judge()
        old, self.run_dir = self.run_dir, self.home / "run2"
        self.write("app/b.py", "w = 1\n")
        self.commit("next")
        plan = self.plan("work", "--base", "main", "--recheck", str(old))
        self.assertEqual([f["path"] for f in plan["files"]], ["app/b.py"])
        self.read_all(plan)
        self.assertEqual(self.verdict(), "INCOMPLETE")
        self.judge()
        self.assertEqual(self.verdict(), "DO NOT MERGE")

    def test_a_cleaned_run_keeps_its_verdict_and_can_be_rechecked(self) -> None:
        self.change()
        plan = self.plan("work", "--base", "main")
        self.read_all(plan, [self.finding(path="app/old.py", line=30)])
        self.judge()
        self.assertEqual(self.verdict(), "DO NOT MERGE")
        self.gate("clean")
        self.assertEqual(self.verdict(), "DO NOT MERGE")
        old, self.run_dir = self.run_dir, self.home / "run2"
        self.write("app/b.py", "w = 1\n")
        self.commit("next")
        self.assertEqual(len(self.plan("work", "--base", "main", "--recheck", str(old))["files"]), 1)

    def test_clean_removes_only_its_own_trees(self) -> None:
        self.change()
        plan = self.plan()
        self.gate("clean")
        self.assertFalse(Path(plan["tree"]).exists())
        self.assertEqual(len(self.git("worktree", "list").splitlines()), 1)


if __name__ == "__main__":
    unittest.main()

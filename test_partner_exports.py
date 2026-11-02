import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import partner_exports as p

FIXTURE = Path(__file__).with_name("scenarios.json")


class PartnerExportsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.out = self.root / "out"
        self.before = FIXTURE.read_bytes()
        p.export(FIXTURE, self.out)

    def rows(self, name):
        return [json.loads(line) for line in (self.out / name).read_text().splitlines()]

    def test_determinism_and_input_unchanged(self):
        other = self.root / "other"
        p.export(FIXTURE, other)
        for name in p.FILES:
            self.assertEqual((self.out / name).read_bytes(), (other / name).read_bytes())
        self.assertEqual(FIXTURE.read_bytes(), self.before)
        self.assertTrue(p.verify(FIXTURE, self.out))
        with self.assertRaises(FileExistsError):
            p.export(FIXTURE, self.out)

    def test_fixture_semantics(self):
        rows = self.rows("decisions.jsonl")
        reasons = {row["decision"]["reason"] for row in rows}
        self.assertTrue({"stale_context", "consent_revoked", "verify_postcondition"} <= reasons)
        for row in rows:
            self.assertEqual(row["decision_sha256"], hashlib.sha256(p.canonical(row["decision"])).hexdigest())
            self.assertEqual(row["decision"]["claims_success"], row["outcome_verified"])

    def test_tampering_extra_duplicate_and_foreign_reference(self):
        original = (self.out / "decisions.jsonl").read_bytes()
        rows = self.rows("decisions.jsonl")
        mutations = [rows + [rows[0]], [dict(rows[0], event_id="foreign")] + rows[1:]]
        changed = json.loads(json.dumps(rows))
        changed[0]["decision"]["evidence_ids"] = ["foreign"]
        mutations.append(changed)
        changed = json.loads(json.dumps(rows))
        changed[0]["decision"]["evidence_ids"] = []
        mutations.append(changed)
        for mutation in mutations:
            (self.out / "decisions.jsonl").write_bytes(b"".join(p.canonical(x) + b"\n" for x in mutation))
            with self.assertRaises(ValueError):
                p.verify(FIXTURE, self.out)
        (self.out / "decisions.jsonl").write_bytes(original)
        (self.out / "extra").touch()
        with self.assertRaises(ValueError):
            p.verify(FIXTURE, self.out)

    def test_lineage_and_identity(self):
        decisions = self.rows("decisions.jsonl")
        evidence = self.rows("evidence.jsonl")
        indexed = {(row["scenario_id"], row["record_id"]): row for row in evidence}
        mismatch = [row for row in evidence if row["record_intent_id"] is not None
                    and row["record_intent_id"] != row["scenario_intent_id"]]
        self.assertTrue(mismatch)
        self.assertTrue(any(row["record_intent_id"] is None for row in evidence))
        for row in evidence:
            self.assertEqual(row["dataset_sha256"], p.DATASET_SHA256)
            self.assertEqual(row["record_intent_id"], row["data"].get("intent_id"))
            record = {key: row[key] for key in ("kind", "version", "timestamp", "data")}
            record["id"] = row["record_id"]
            identity = {"dataset_sha256": p.DATASET_SHA256,
                        "scenario_id": row["scenario_id"], "record": record}
            self.assertEqual(row["evidence_key"], p.digest(p.canonical(identity)))
        self.assertEqual(len({row["evidence_key"] for row in evidence}), len(evidence))
        for row in decisions:
            self.assertEqual(row["dataset_sha256"], p.DATASET_SHA256)
            identity = dict(row)
            event_id = identity.pop("event_id")
            self.assertEqual(event_id, p.digest(p.canonical(identity)))
            self.assertEqual(row["selected_evidence_keys"],
                             [indexed[(row["scenario_id"], ref)]["evidence_key"]
                              for ref in row["decision"]["evidence_ids"]])

    def test_symlink_root_and_file_rejected(self):
        link = self.root / "link"
        link.symlink_to(self.out, target_is_directory=True)
        with self.assertRaises(ValueError):
            p.verify(FIXTURE, link)
        file = self.out / "manifest.json"
        backup = self.root / "manifest"
        file.rename(backup)
        file.symlink_to(backup)
        with self.assertRaises(ValueError):
            p.verify(FIXTURE, self.out)

    def test_reject_changed_input(self):
        altered = self.root / "altered.json"
        altered.write_bytes(self.before + b" ")
        with self.assertRaises(ValueError):
            p.export(altered, self.root / "bad")
        with self.assertRaises(ValueError):
            p.verify(altered, self.out)
        self.assertFalse((self.root / "bad").exists())


if __name__ == "__main__":
    unittest.main()

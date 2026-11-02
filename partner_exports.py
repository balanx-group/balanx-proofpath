#!/usr/bin/env python3
"""Create and verify offline BalanX ProofPath synthetic evaluation exports."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import benchmark

DATASET_SHA256 = "03507aca77a3028f35f2c387805d0992d43aa968c919fd9d51ef6b0fd43de6a9"
SCHEMA = "proofpath-partner-evaluation/1.0"
SCOPE = "Public synthetic fixtures and reference evaluation only; no live integration or program validation."
FILES = {"decisions.jsonl", "evidence.jsonl", "manifest.json"}


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def digest(value):
    return hashlib.sha256(value).hexdigest()


def load_dataset(path):
    raw = path.read_bytes()
    if digest(raw) != DATASET_SHA256:
        raise ValueError("Dataset does not match the pinned public synthetic fixture")
    data = json.loads(raw)
    benchmark.validate_dataset(data)
    return data


def build(data):
    decisions, evidence = [], []
    for case in data["scenarios"]:
        result = benchmark.reference_decision(case)
        decision_hash = digest(canonical(result))
        intent = case["facts"]["intent_id"]
        keys = {}
        for record in case["records"]:
            identity = {"dataset_sha256": DATASET_SHA256, "scenario_id": case["id"],
                        "record": record}
            key = digest(canonical(identity))
            keys[record["id"]] = key
            evidence.append({"dataset_sha256": DATASET_SHA256, "scenario_id": case["id"],
                             "scenario_intent_id": intent,
                             "record_intent_id": record["data"].get("intent_id"),
                             "evidence_key": key, "record_id": record["id"],
                             "kind": record["kind"], "version": record["version"],
                             "timestamp": record["timestamp"], "data": record["data"],
                             "scope": SCOPE})
        event = {"dataset_sha256": DATASET_SHA256, "scenario_id": case["id"],
                 "intent_id": intent, "request_id": case["facts"]["request_id"],
                 "decision": result, "decision_sha256": decision_hash,
                 "selected_evidence_keys": [keys[record_id] for record_id in result["evidence_ids"]],
                 "outcome_verified": benchmark.has_verified_outcome(case), "scope": SCOPE}
        event["event_id"] = digest(canonical(event))
        decisions.append(event)
    contents = {"decisions.jsonl": b"".join(canonical(row) + b"\n" for row in decisions),
                "evidence.jsonl": b"".join(canonical(row) + b"\n" for row in evidence)}
    manifest = {"schema_version": SCHEMA, "scope": SCOPE, "dataset_sha256": DATASET_SHA256,
                "counts": {"decisions": len(decisions), "evidence": len(evidence)},
                "files": {name: {"sha256": digest(value), "bytes": len(value)}
                          for name, value in sorted(contents.items())}}
    contents["manifest.json"] = canonical(manifest) + b"\n"
    return contents


def export(dataset, output):
    contents = build(load_dataset(dataset))
    output.mkdir(parents=False, exist_ok=False)
    for name, value in contents.items():
        (output / name).write_bytes(value)


def verify(dataset, output):
    expected = build(load_dataset(dataset))
    if output.is_symlink() or not output.is_dir() or {p.name for p in output.iterdir()} != FILES:
        raise ValueError("Export must contain exactly the three expected files")
    for name in sorted(FILES):
        path = output / name
        if path.is_symlink() or not path.is_file() or path.read_bytes() != expected[name]:
            raise ValueError(f"Export differs from pinned reference: {name}")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("export", "verify"))
    parser.add_argument("output", type=Path)
    parser.add_argument("--scenarios", type=Path, default=Path(__file__).with_name("scenarios.json"))
    args = parser.parse_args()
    try:
        if args.command == "export":
            export(args.scenarios, args.output)
        else:
            verify(args.scenarios, args.output)
        print(f"{args.command}: OK ({SCOPE})")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"{args.command}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

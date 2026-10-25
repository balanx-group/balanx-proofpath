#!/usr/bin/env python3
"""Offline teaching helper for the bundled, synthetic ProofPath fixture set."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.dont_write_bytecode = True
from _reference import build_report, reference_decision, score_prediction, validate_dataset

FIXTURE_SHA256 = "03507aca77a3028f35f2c387805d0992d43aa968c919fd9d51ef6b0fd43de6a9"
MAX_INPUT_BYTES = 65536
KEYS = {"action", "reason", "evidence_ids", "claims_success", "disclosed_fields"}

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON keys are not allowed")
        result[key] = value
    return result

def load_dataset():
    source = (Path(__file__).resolve().parent.parent / "assets/scenarios.json").read_bytes()
    if hashlib.sha256(source).hexdigest() != FIXTURE_SHA256:
        raise ValueError("Bundled fixture integrity check failed; repair the package")
    dataset = json.loads(source, object_pairs_hook=unique_object)
    validate_dataset(dataset)
    return source, dataset

def read_prediction():
    raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
    if len(raw) > MAX_INPUT_BYTES:
        raise ValueError("Decision input exceeds the 64 KiB limit")
    prediction = json.loads(raw, object_pairs_hook=unique_object)
    if not isinstance(prediction, dict) or set(prediction) != KEYS:
        raise ValueError("Decision must contain exactly action, reason, evidence_ids, claims_success and disclosed_fields")
    if not isinstance(prediction["reason"], str) or len(prediction["reason"]) > 128:
        raise ValueError("Reason must be a string of at most 128 characters")
    for field in ("evidence_ids", "disclosed_fields"):
        if not isinstance(prediction[field], list) or len(prediction[field]) > 32:
            raise ValueError("Decision lists must contain at most 32 strings")
        if any(not isinstance(v, str) or len(v) > 128 for v in prediction[field]):
            raise ValueError("Decision list entries must be strings of at most 128 characters")
    return prediction

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("list", help="List the bundled fictional cases")
    show = commands.add_parser("inspect", help="Show one fictional case")
    show.add_argument("case_id")
    show.add_argument("--answer", action="store_true", help="Reveal its public reference answer")
    score = commands.add_parser("score", help="Score a decision JSON object read from standard input")
    score.add_argument("case_id")
    commands.add_parser("report", help="Run the deterministic reference and brittle script")
    args = parser.parse_args()
    try:
        source, dataset = load_dataset()
        if args.command == "list":
            result = {"scope": "Public fictional cases", "cases": [{k: c[k] for k in ("id", "title", "category")} for c in dataset["scenarios"]]}
        elif args.command == "report":
            result = build_report(dataset, source)
        else:
            matches = [c for c in dataset["scenarios"] if c["id"] == args.case_id]
            if not matches:
                raise ValueError("Unknown bundled case ID; use list")
            case = matches[0]
            if args.command == "inspect":
                result = {k: v for k, v in case.items() if args.answer or k != "expected"}
            else:
                prediction = read_prediction()
                result = {"scope": "Synthetic teaching fixture; no real action performed", "score": score_prediction(case, prediction), "reference": reference_decision(case)}
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    except (OSError, UnicodeError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())

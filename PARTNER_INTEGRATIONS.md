# BalanX ProofPath partner evaluation exports

These files contain public synthetic fixtures and deterministic reference decisions for offline evaluation. They do not demonstrate a live Databricks or Neo4j integration, vendor approval, program validation, model performance, or real-world safety. No native vendor writes are performed by the exporter.

From this directory, with Python 3 and the standard library:

```sh
python3 partner_exports.py export /absolute/path/to/new-proofpath-export
python3 partner_exports.py verify /absolute/path/to/new-proofpath-export
python3 -m unittest test_partner_exports.py test_benchmark.py
```

The output directory must not exist; its parent must exist. The input defaults to the adjacent `scenarios.json`; `--scenarios /path/to/scenarios.json` is accepted only when its exact SHA-256 is `03507aca77a3028f35f2c387805d0992d43aa968c919fd9d51ef6b0fd43de6a9`. Dataset validation precedes export or verification. Verification regenerates the exact expected bytes, including manifest, so changed decisions, duplicate identifiers, missing or foreign evidence references, altered hashes, and extra files fail even if an altered manifest is supplied. This is a fixed-fixture integrity check, not a signature or an authenticity guarantee for the local program itself. Protect the code and fixture with normal source controls.

`decisions.jsonl` has one event per scenario; `event_id` is SHA-256 of the canonical event before adding the ID, and `decision_sha256` is SHA-256 of the canonical reference decision. Canonical JSON uses UTF-8, sorted keys, no insignificant spaces, and unescaped Unicode. `evidence.jsonl` includes all fixture records, including policy, consent, receipt and checkpoint records. Each row carries the dataset hash, scenario intent and actual record intent separately; an unscoped record intent is null. Each `evidence_key` hashes canonical JSON containing the dataset hash, scenario ID and complete original record. Decision `evidence_ids` resolve within the scenario to `selected_evidence_keys`. The event hash includes the dataset hash and selected keys. `outcome_verified` follows the reference's matching-intent, latest-receipt semantics. The manifest records exact bytes, SHA-256 and counts. Each row states the scope.

## Optional native evaluation

First verify the export locally. Obtain the appropriate workspace or database permissions, an approved isolated synthetic destination, current cost and credit coverage, and explicit authorization for uploading and writing before proceeding. Use a least-privilege identity; preserve other data. Vendor-specific execution, access controls, retention, deletion, and billed usage are outside this offline tool. Treat these steps as integration guidance requiring adaptation to the target environment.

For **Databricks**, select a dedicated authorized sandbox catalog and schema, a new pair of table names, and a sandbox volume path containing the two verified files. Substitute the illustrative placeholders below with those exact selections; never point them at an existing shared table. This template requires a Databricks SQL runtime supporting `read_files`, `parse_json`, and `VARIANT`. Store the original rows as variants to preserve nested fields and nulls, alongside explicitly typed keys for joins and readback.

```sql
CREATE TABLE <sandbox_catalog>.<sandbox_schema>.<new_decisions_table> (
  dataset_sha256 STRING, event_id STRING, scenario_id STRING,
  decision_sha256 STRING, outcome_verified BOOLEAN, payload VARIANT
) USING DELTA;
INSERT INTO <sandbox_catalog>.<sandbox_schema>.<new_decisions_table>
SELECT CAST(v:dataset_sha256 AS STRING), CAST(v:event_id AS STRING),
       CAST(v:scenario_id AS STRING), CAST(v:decision_sha256 AS STRING),
       CAST(v:outcome_verified AS BOOLEAN), v
FROM (SELECT parse_json(value) AS v
      FROM read_files('/Volumes/<sandbox_catalog>/<sandbox_schema>/<volume>/<export>/decisions.jsonl', format => 'text'));

CREATE TABLE <sandbox_catalog>.<sandbox_schema>.<new_evidence_table> (
  dataset_sha256 STRING, evidence_key STRING, scenario_id STRING,
  record_id STRING, scenario_intent_id STRING, record_intent_id STRING, payload VARIANT
) USING DELTA;
INSERT INTO <sandbox_catalog>.<sandbox_schema>.<new_evidence_table>
SELECT CAST(v:dataset_sha256 AS STRING), CAST(v:evidence_key AS STRING),
       CAST(v:scenario_id AS STRING), CAST(v:record_id AS STRING),
       CAST(v:scenario_intent_id AS STRING), CAST(v:record_intent_id AS STRING), v
FROM (SELECT parse_json(value) AS v
      FROM read_files('/Volumes/<sandbox_catalog>/<sandbox_schema>/<volume>/<export>/evidence.jsonl', format => 'text'));

SELECT count(*) AS rows, count(DISTINCT event_id) AS distinct_ids
FROM <sandbox_catalog>.<sandbox_schema>.<new_decisions_table>;
SELECT count(*) AS rows, count(DISTINCT evidence_key) AS distinct_ids
FROM <sandbox_catalog>.<sandbox_schema>.<new_evidence_table>;
WITH cited AS (
  SELECT d.event_id, d.dataset_sha256, d.scenario_id,
         CAST(k.value AS STRING) AS evidence_key
  FROM <sandbox_catalog>.<sandbox_schema>.<new_decisions_table> d,
       LATERAL variant_explode(d.payload:selected_evidence_keys) k
)
SELECT c.event_id, c.evidence_key AS missing_key
FROM cited c
LEFT JOIN <sandbox_catalog>.<sandbox_schema>.<new_evidence_table> e
  ON e.evidence_key = c.evidence_key
 AND e.scenario_id = c.scenario_id AND e.dataset_sha256 = c.dataset_sha256
WHERE e.evidence_key IS NULL;
```

Compare counts with the manifest, require zero missing citations, and compare all readback payloads and keys with the locally verified source. Check runtime syntax, null handling and variant support in the selected environment first. SQL is a template, not execution evidence.

The SQL template requires Databricks SQL or Runtime 15.3 or later for `VARIANT` and `variant_explode`. The documented native functions are [read_files](https://docs.databricks.com/aws/en/sql/language-manual/functions/read_files), [parse_json](https://docs.databricks.com/aws/en/sql/language-manual/functions/parse_json) and [variant_explode](https://docs.databricks.com/aws/en/sql/language-manual/functions/variant_explode). Run each import once into its newly selected tables; repeated `INSERT` statements append rows. Duplicate counts must fail the evaluation.

For **Neo4j**, a permitted client can parse JSONL and pass batches as parameters. Use a dedicated isolated database. The following constraints require appropriate schema privileges and a compatible Neo4j version:

```cypher
CREATE CONSTRAINT proofpath_event_unique IF NOT EXISTS FOR (d:ProofPathDecision) REQUIRE d.event_id IS UNIQUE;
CREATE CONSTRAINT proofpath_evidence_unique IF NOT EXISTS FOR (e:ProofPathEvidence) REQUIRE e.evidence_key IS UNIQUE;
```

Supply `$rows` and `$evidence` as decoded rows, with `payload_json` added as a canonical JSON serialization of each complete original row; Neo4j node properties cannot store nested maps. Supply `$references` as `{event_id, evidence_key}` pairs expanded from each decision's `selected_evidence_keys`.

```cypher
UNWIND $rows AS row
MERGE (d:ProofPathDecision {event_id: row.event_id})
SET d.dataset_sha256 = row.dataset_sha256, d.scenario_id = row.scenario_id,
    d.payload_json = row.payload_json
```

```cypher
UNWIND $evidence AS row
MERGE (e:ProofPathEvidence {evidence_key: row.evidence_key})
SET e.dataset_sha256 = row.dataset_sha256, e.scenario_id = row.scenario_id,
    e.payload_json = row.payload_json
```

```cypher
UNWIND $references AS ref
MATCH (d:ProofPathDecision {event_id: ref.event_id})
MATCH (e:ProofPathEvidence {evidence_key: ref.evidence_key})
WHERE d.dataset_sha256 = e.dataset_sha256 AND d.scenario_id = e.scenario_id
MERGE (d)-[:CITES]->(e)
RETURN count(*) AS matched_references
```

A `MATCH` can silently omit missing endpoints: compare `matched_references` to the expected reference count. Read back all properties and edges and compare them with the verified local files, including no missing or foreign references. These counts provide an initial check:

```cypher
MATCH (d:ProofPathDecision) RETURN count(d) AS rows, count(DISTINCT d.event_id) AS distinct_ids;
MATCH (e:ProofPathEvidence) RETURN count(e) AS rows, count(DISTINCT e.evidence_key) AS distinct_ids;
MATCH (d:ProofPathDecision)-[r:CITES]->(e:ProofPathEvidence)
RETURN count(r) AS references,
       sum(CASE WHEN d.dataset_sha256 <> e.dataset_sha256 OR d.scenario_id <> e.scenario_id THEN 1 ELSE 0 END) AS foreign_references;
```

These examples do not establish transactional completeness, deployment compatibility, or permission to upload.

Neo4j's [constraint documentation](https://neo4j.com/docs/cypher-manual/current/schema/constraints/create-constraints/) describes uniqueness and required schema privileges. BalanX's existing hosted connection permits reads only; this guide does not expand that grant.

# BalanX ProofPath

ProofPath is an original, open synthetic demonstration of evidence-preserving administrative decisions. It asks a small, concrete question: **can this request safely move forward?**

The browser exercise and deterministic Python reference cover changed consent, stale evidence, duplicate prevention, interrupted workflows, mismatched intent, unnecessary disclosure, and truthful completion claims. All cases, people, requests, field names and outcomes are fictional. No real application or service request is sent.

## Run the browser exercise

Python 3 is the only requirement for serving these files locally:

```sh
python3 -m http.server --bind 127.0.0.1 8080
```

Open `http://127.0.0.1:8080` in a browser. Opening `index.html` directly with a `file:` URL may block loading the JSON fixture files.

1. Choose a case and inspect the request, saved versions and evidence ledger.
2. Cite the records supporting the next action.
3. Choose an action, a decisive reason, any fields to send, and whether a completed outcome is verified.
4. Check the decision. Each of the eight checks is explained. The published answer is available after checking.
5. Export a JSON session if useful. The export contains only structured fixture decisions and evaluation results.

Case switches preserve drafts within the current tab. A case URL contains only its fixture ID. Reset applies to the current decision and has an undo. Reloading starts a new session. No session is automatically written to local storage or transmitted to a service.

## Run the deterministic checks

```sh
python3 -m unittest -v test_benchmark.py
python3 benchmark.py --help
python3 benchmark.py --output results.json
```

See the command's help for supported output and prediction-file options. `benchmark.py` implements the reference decision logic and scoring. `scenarios.json` contains the open fixtures and expected decisions. `results.json` is a generated report; the browser shows its score totals only when its dataset SHA-256 matches the loaded fixture file.

The browser scorer mirrors the Python checks: correct action, correct reason, required known evidence, supported completion claim, matching completion claim, authorized fields, and no unnecessary disclosure. Additional known evidence may be cited; required evidence must be included. The authoritative contract is `score_prediction()` in `benchmark.py`. The session's SHA-256 is a reproducibility fingerprint, not authentication, a signature, or tamper-proof security. If the browser cannot compute it, the export explicitly records it as unavailable.

## Scope and interpretation

- The suite contains hand-constructed, openly visible demonstration fixtures. It is not a representative statistical benchmark, a blind evaluation, or a security guarantee.
- The intentionally brittle scripted baseline ignores selected version, authority and intent constraints. It is useful for making failure modes reproducible. It is **not an AI model**.
- The rule-based reference is designed for this finite toy schema. A perfect score does not establish real-world reliability.
- No OpenAI model, autonomous agent, live BalanX product, customer deployment, clinical workflow, or public service is evaluated by the included script results.
- No service credentials, personal data, production code, external dependencies, analytics, remote fonts, or API calls are required.
- Browser decisions are local practice records. Downloads may be stored wherever the user's browser normally saves files.

## Public benefit

Researchers and builders can inspect the failure conditions, reproduce them at no inference cost, extend the synthetic cases, and compare structured decisions against explicit expectations. The immediate benefit is a small auditable teaching and testing artifact for reducing duplicate actions, excessive disclosure and unsupported success claims in administrative workflows. Any impact on real people or services remains to be evaluated. See [RESEARCH.md](RESEARCH.md) for the research framing and proposed extensions.

## Proposed Sign in with ChatGPT exploration

BalanX is exploring identity and, where approved and eligible, ChatGPT-plan integration for its products, which the owner describes as implemented and in beta testing. ProofPath is a separate supporting prototype. It does not implement OpenAI authentication, consume plan entitlements, or make model requests. A future research integration would need approval, documented permissions, and separate evaluation.

## Container packaging

The included Dockerfile serves the static artifact with the Python standard library as a non-root user on port 8080. Local container build and execution were not verified because Docker was unavailable in the authoring environment.

For an environment with Docker:

```sh
docker build -t balanx-proofpath .
docker run --rm -p 127.0.0.1:8080:8080 balanx-proofpath
```

The first build may download its Python base image. No cloud deployment is required.

## Accessibility and implementation

The static interface uses native controls, explicit labels, live status messages, keyboard focus, responsive layouts and reduced-motion/forced-colors styles. It targets WCAG 2.2 AA; a certification or complete assistive-technology audit is not claimed. `DESIGN.md` records the visual system and behavior ownership. Fixture data is rendered as text rather than HTML.

The MIT license applies to the original synthetic code and fixtures in this directory. It does not grant rights to BalanX production products or third-party brands. OpenAI does not sponsor or endorse this demonstration.

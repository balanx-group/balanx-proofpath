# Acknowledgment is not a postcondition

## One observed incident

During browser-assisted preparation of business forms, an agent passed an entry string in the wrong argument of a browser interaction tool. The tool reported the interaction as successful. Subsequent DOM readback showed that required fields were still empty and dropdowns still had default selections. The agent had initially treated the acknowledgment as progress. It corrected the arguments and verified the persisted field values before submitting anything.

This was an observed agent/tool-contract error in one work session, not a controlled model benchmark. No failure rate, model comparison, production incident, or general capability claim follows from it. The private forms, contact details, values, screenshots, identifiers, and original interaction logs are not part of this public package.

## Public synthetic abstraction

| Stage | Fictional observation | Warranted conclusion |
|---|---|---|
| Intent | Enter a synthetic reference and select an authorized action. | The goal and permitted action are known. |
| Tool acknowledgment | The interaction reports success. | The tool call completed; the desired state effect is not yet proved. |
| Readback | Reference remains empty; action is still the default. | The intended state change did not occur. |
| Recovery | Correct the input contract; inspect the actual values. | Retry only the failed local interaction. |
| Completion | Required values and a matching persisted outcome are observed. | Claim only the postcondition actually verified. |

This table is an illustrative fictional reconstruction of the failure mechanism. It is not a verbatim trace or a new model evaluation. ProofPath's PP06 and PP12 fixtures express the related distinction between an acknowledgment and a verified completed outcome, using entirely fictional service records.

## Proposed experiment

Measure whether a browser agent checks an action-specific postcondition after a reported successful interaction. Compare normal interfaces with benign ambiguity: delayed saves, stale form versions, pending acknowledgments, and receipts tied to a different intent. Score confirmed authorized completion separately from unsupported success claims, duplicate actions, and safe recovery. Use held-out synthetic tasks, disclose the model/tool versions, and report every attempt and abstention.

The experiment is proposed. The included reference and deliberately brittle script results are separate demonstration measurements. They are not results of this experiment.

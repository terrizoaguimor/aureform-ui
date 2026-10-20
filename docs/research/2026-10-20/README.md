# October 2026 research evidence

[English report](../../website/en/research.md) · [Informe en español](../../website/es/research.md) · [Roadmap](../../website/en/roadmap.md) · [GitHub discovery](../../github-discovery.md)

The immutable research baseline is Aureform v1.4.1 at
`70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0`. New quality and Sponsors implementation
is reviewed separately from that source state.

- [agy-provenance.json](agy-provenance.json) records three completed headless
  investigations, selected model `gemini-4-argon-high`, CLI versions 1.4.2/1.4.3,
  timings, statuses, 52 observed search queries and final-response hashes.
  Two initial failed attempts are retained as failed attempts.
- [verification.json](verification.json) records independently retrieved primary
  sources, requested/final URLs, issue context, code references and corrections
  to model claims. An invalid citation can remain in the ledger as a failed
  check; it is not presented as supporting evidence.

The workflow investigation included repository review. Successful design and
adoption retries used public-web research and were followed by independent
baseline code review. Observed `search_web` calls establish that searches ran;
they do not expose native Google API grounding metadata or make every generated
claim reliable.

The public reports retain reviewed conclusions rather than raw provider
transcripts. They do not publish thinking, private configuration, conversation
identifiers or local machine paths. Response hashes identify locally retained
artifacts; identical text is not promised on a stochastic rerun.

## Running another investigation

Create an isolated checkout of the intended baseline and use the versioned
[headless runner](../../../scripts/research-agy.mjs). AGY must already be
installed and authenticated outside the repository:

```bash
git worktree add --detach ../aureform-research \
  70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0
node scripts/research-agy.mjs \
  --cwd ../aureform-research \
  --output artifacts/research-agy/new-investigation
```

The runner checks the selected model, final success status and observed searches
before classifying a topic as completed. `--only design`, `--only workflows` or
`--only adoption` selects a topic; `--web-only` limits a retry to public research.
Review new results against primary sources and the selected code baseline before
publishing conclusions. Public documentation, specific issue experiences and
proposed acceptance criteria do not establish representative market demand.

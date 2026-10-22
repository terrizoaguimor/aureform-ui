# First real incoming Twilio call — manual report

Reported **2026-10-21, America/Bogota**. This records the project owner's manual confirmation in the development conversation after the [implicit US1/setup transport correction](AUTOMATIC-SETUP-REGION-FIX.md).

| Field | Evidence |
| --- | --- |
| Provider | Twilio, previously selected by the owner for the first real call. |
| Environment | Private local Softphone consumer with the separate authenticated reference backend. |
| Code checkpoint | [`0fa95e5912b6e2da3408b6a40d3fc64820f7a591`](https://github.com/terrizoaguimor/aureform-ui/commit/0fa95e5912b6e2da3408b6a40d3fc64820f7a591). |
| Reported result | A real incoming call arrived and worked successfully. |
| Evidence source | The owner's statement; the agent did not independently observe or record the call. |

The original confirmation was: “Ya logre que la llamada entrara y funciona perfectamente!!”

## Scope

This is the first user-confirmed real incoming Twilio call for this laboratory. It is separate from automated unit tests, local demo scenarios and the preceding read-only configuration plans. The report does not specify the call's duration, termination, individual controls, two-way audio measurements or correlated event timeline; those details are not inferred.

Telnyx live acceptance remains pending. This report does not establish production readiness, uninterrupted token renewal, concurrent-agent behavior, failure recovery or provider interchangeability. Further calls and paid configuration changes retain their separate explicit authorization.

No credentials, account or call identifiers, phone numbers, audio, private screenshots or private backend address are published in this record.

## Historical evidence and design source

The [initial Softphone receipt](VALIDATION.md), [automatic setup receipt](AUTOMATIC-SETUP-VALIDATION.md) and [correction receipt](AUTOMATIC-SETUP-REGION-FIX.json) retain their original dates and limits. In particular, the correction's source hashes identify the files [at its own code checkpoint](https://github.com/terrizoaguimor/aureform-ui/blob/0fa95e5912b6e2da3408b6a40d3fc64820f7a591/docs/communications/AUTOMATIC-SETUP-REGION-FIX.json); later documentation updates do not rewrite that read-only observation into a call test.

The existing editable source remains [Figma page 14 · Communications · Automatic setup](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59). Recording this manual result changes documentation only.

# AureformUI: English GitHub submission drafts

[Research in English](../github-discovery.md) · [Investigación en español](../github-discovery.es.md)

Checked **2026-10-19, America/Bogota / 2026-10-20 UTC**. These are proposed entries for owner review. **Nothing has been submitted.** Opening a third-party PR, issue, discussion or submission form requires explicit user authorization. Review the destination's current template and pending proposals before use.

The project provides 69 demo views, 44 core families, 107 registry entries and six palettes. [Current project scope](../../README.md), [installation](../website/en/installation.md). Authentication/payment demos use mocks and backend adapters. The native Figma 1.2.1 checkpoint is frozen; 1.4 application additions are source-only. [Design scope](../figma-distribution.md). Keep those boundaries in the proposed PR notes even when the list entry is shorter.

## birobirobiro/awesome-shadcn-ui

**Source:** [`README.md` → `Registries`](https://github.com/birobirobiro/awesome-shadcn-ui#registries).

**Title:** `Add aureform-ui to Registries`

Entry:

```markdown
| aureform-ui | Apache-2.0 shadcn-compatible registry of editable React components and SaaS dashboard blocks with an appearance studio. | [Link](https://aureformui.com/) |
```

Proposed PR note:

```text
I maintain AureformUI, a frontend UI kit with a public shadcn-compatible source registry. The catalog contains 107 entries, including components, blocks, providers and effects. Documentation includes full-URL installation and host requirements: https://aureformui.com/en/docs/installation/

The demo uses frontend auth/payment mocks and adapters. Its native Figma 1.2.1 checkpoint is frozen; new 1.4 application blocks are source additions.
```

Keep the standardized `aureform-ui` name in alphabetical order within Registries. Submit **three columns only**: the workflow supplies Date after merge. One entry across the entire README; no extra links in the row description. The website's form opens a PR and is subject to the same authorization boundary. [Current rules](https://github.com/birobirobiro/awesome-shadcn-ui/blob/main/CONTRIBUTING.md).

## Official shadcn Registry Directory

**Source:** [`apps/v4/registry/directory.json`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/directory.json).

**Title:** `feat(registry): add AureformUI`

Proposed entry:

```json
{
  "name": "@aureform",
  "homepage": "https://aureformui.com",
  "url": "https://aureformui.com/r/{name}.json",
  "description": "Editable React components and SaaS dashboard blocks with six palettes and an appearance studio.",
  "logo": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='#315D48'/><path d='M12 36 22 12h5L17 36h-5Zm17-16 7 16h-5l-5-11 3-5Zm-10 9h8l2 4H17l2-4Z' fill='#F7F7F2'/></svg>"
}
```

The SVG reproduces the repository's original [favicon](../../public/favicon.svg). The namespace is a **proposal**, absent in the checked directory, and must be checked again; it is not reserved or published. Insert into the existing directory order.

Proposed PR note:

```text
I maintain AureformUI, an Apache-2.0 frontend UI kit. This proposes @aureform for its public source registry at https://aureformui.com/r/{name}.json.

The flat catalog at https://aureformui.com/r/registry.json contains 107 entries and omits inline file content. Individual install payloads include source. Setup and provider requirements are documented at https://aureformui.com/en/docs/installation/.

The proposed logo comes from the project's original favicon. Authentication and payments are frontend mocks/adapters, and the native Figma 1.2.1 checkpoint remains frozen.
```

**Not submission-ready until validation:** a later authorized contributor must run `pnpm validate:registries` and attach actual fresh consumer-install results. This research checked public HTTP/JSON structure; it did not run the upstream validator or installation. Do not add a “validation passed” claim or advertise namespace installation until the corresponding work/acceptance happens. [Official procedure](https://ui.shadcn.com/docs/registry/registry-index), [required entry fields](https://github.com/shadcn-ui/ui/blob/main/apps/v4/lib/registry-directory.ts).

## unicodeveloper/awesome-nextjs

**Source:** [`README.md` → `Boilerplates`](https://github.com/unicodeveloper/awesome-nextjs#boilerplates).

**Title:** `Add Aureform UI`

Entry:

```markdown
- [Aureform UI](https://github.com/terrizoaguimor/aureform-ui) - Apache-2.0 Next.js frontend kit for SaaS dashboards and internal tools, with editable components, six palettes and an appearance studio.
```

Proposed PR note:

```text
I maintain AureformUI. It is a Next.js frontend kit with a cloneable demo and a local CLI for a smaller starter. The kit has 69 demo views, 44 core component families and 107 registry entries.

Demo: https://aureformui.com/
Documentation: https://aureformui.com/en/docs/

Authentication and payments use frontend mocks/adapters for the consumer's backend. The native Figma 1.2.1 checkpoint is frozen; new 1.4 application blocks are source additions.
```

One suggestion per PR. Keep the title-case name, short capitalized description and final period; preserve the section's existing order. The guide also asks for the project repository link in the eventual commit-message body. Do not claim full-stack authentication or Stripe support. [Contribution rules](https://github.com/unicodeveloper/awesome-nextjs/blob/master/CONTRIBUTING.md).

## dalisoft/awesome-ui-libraries

**Source:** [`README.md` → `UI Libraries`](https://github.com/dalisoft/awesome-ui-libraries#ui-libraries).

**Title:** `Add AureformUI to UI Libraries`

Entry:

```markdown
| AureformUI | React | <https://github.com/terrizoaguimor/aureform-ui> | <https://aureformui.com> | - | - | - |
```

Proposed PR note:

```text
I maintain AureformUI, an Apache-2.0 Next.js/React frontend kit with editable components, dashboard blocks, six palettes and an appearance studio. It has public documentation, a local source installer and a shadcn-compatible registry.

The seven-column row leaves Pro, Favorite and MCP as "-" because this submission establishes no paid tier, maintainer rating or Aureform MCP server. Demo authentication and payments use mocks/adapters. The native Figma 1.2.1 checkpoint is frozen.
```

Use the existing seven columns: Name, Framework, Repository, Website, PRO, Favorite, MCP. Place the row with the surrounding A entries as an existing-style choice, not a published alphabetical requirement. Avoid a second entry under Templates/UI Shadcn for the same resource. [Verification/license rules](https://github.com/dalisoft/awesome-ui-libraries/blob/master/CONTRIBUTING.md), [table definitions](https://github.com/dalisoft/awesome-ui-libraries#ui-libraries).

## alexpate/awesome-design-systems

**Source:** [Five-column table in `README.md`](https://github.com/alexpate/awesome-design-systems/blob/master/README.md).

**Title:** `Add Aureform UI`

Entry:

```markdown
| [Aureform UI](https://aureformui.com/en/docs/) | 👍 | | 👍 | [:octocat:](https://github.com/terrizoaguimor/aureform-ui) |
```

Proposed PR note:

```text
I maintain AureformUI, an Apache-2.0 frontend UI kit with coded components, semantic tokens, six palettes and an appearance studio. Documentation and source are public.

The Components and Source code cells refer to the actual code/examples. Voice & Tone is left empty. Designers Kit refers to the editable native Figma 1.2.1 companion and the documented repository design resources. That checkpoint remains frozen: new 1.4 application blocks are source-only, no native .fig file is bundled, and local Code Connect validation is not cloud certification.

Design formats and access scope: https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/figma-distribution.md
```

Columns are project, Components, Voice & Tone, Designers Kit, Source code. Insert between **Atlassian Design System** and **Aurora (Government of Canada)** in the checked order. Before submission, verify that the linked frozen designer resource remains accessible; if it is not, leave Designers Kit empty. Do not turn that marker into a claim of current source/design parity. [Definitions and existing style](https://github.com/alexpate/awesome-design-systems/blob/master/README.md).

## bytefer/awesome-nextjs

Secondary option, below the five priorities.

**Source:** [`README.md` → `Starter`](https://github.com/bytefer/awesome-nextjs#starter).

**Title:** `Add Aureform UI to Starter`

Entry:

```markdown
- [Aureform UI](https://github.com/terrizoaguimor/aureform-ui) - Apache-2.0 Next.js frontend kit with dashboard templates, editable components, six palettes and a local starter CLI.
```

Proposed PR note:

```text
I maintain AureformUI. It provides a cloneable Next.js frontend demonstration and a local CLI that creates a smaller consumer starter.

Demo and installation documentation: https://aureformui.com/

Authentication and payments use frontend mocks/adapters for the consumer's backend. The native Figma 1.2.1 checkpoint remains frozen; new 1.4 application blocks are source additions.
```

Follow the section's linked-bullet style; no alphabetical rule or separate contribution guide was established. Recent editorial activity is weaker than the priority destinations. [README invitation](https://github.com/bytefer/awesome-nextjs#contributing).

## Destinations without copyable submissions

- **aniftyco/awesome-tailwindcss:** human-authored, personally evaluated submissions only; AI-assisted drafts are prohibited. No entry or PR text is prepared. [Policy](https://github.com/aniftyco/awesome-tailwindcss/blob/master/CONTRIBUTING.md).
- **officialrajdeepsingh/awesome-nextjs:** project maturity and normal 100-star gate are not met by the checked snapshot. [Policy](https://github.com/officialrajdeepsingh/awesome-nextjs/blob/main/CONTRIBUTING.md).
- **codesandtags/frontend-resources:** independent community recommendation evidence is not established. [Policy](https://github.com/codesandtags/frontend-resources/blob/main/CONTRIBUTING.md).
- **enaqx/awesome-react**, **brandonhimpfen/awesome-tailwindcss:** defer pending evidence of use/relevance rather than treating editorial lists as promotional inventory. [React policy](https://github.com/enaqx/awesome-react#contribution), [Tailwind policy](https://github.com/brandonhimpfen/awesome-tailwindcss/blob/main/CONTRIBUTING.md).
- **brillout/awesome-react-components:** no justified removal has been identified to satisfy its addition-and-removal requirement. [Policy](https://github.com/brillout/awesome-react-components/blob/master/CONTRIBUTING.md).
- **Vercel Templates:** a Vercel-hosted demo and README Deploy button must exist before using its form. [Requirements](https://vercel.com/templates/submit).
- **github/explore:** community-interest topics/collections are expected; a brand promotion PR is a poor fit. [Policy](https://github.com/github/explore/blob/main/CONTRIBUTING.md).

Do not submit these drafts wholesale, fabricate passed checkboxes, invent user adoption, use bot stars, pay for placement or promise acceptance. Re-read each destination's rules before any explicitly authorized external action.

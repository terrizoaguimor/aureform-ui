# The application's design tokens

[aureform.tokens.json](aureform.tokens.json) is a byte-preserving copy of the application's [token source](../../tokens/aureform.tokens.json). [tokens.css](tokens.css) is copied from the [generated stylesheet](../../src/styles/tokens.css).

The JSON is Aureform's application format: primitives, semantic aliases, spacing, radii, typography, effects, palette values and Light/Dark defaults. It is not advertised as a plug-and-play Tokens Studio import or a native Figma variable export.

Edit the canonical file in `tokens/`, then run:

```bash
pnpm tokens
python3 design/scripts/prepare_design.py --bundle
```

The [rebuild plugin](../rebuild-plugin/README.md) uses these supplied values locally. Its semantic variables alias the imported primitives, with explicit scopes and CSS code syntax.

The original Figma file's live inventory—714 variables in eight collections—is recorded separately in [the native inventory](../reports/native-inventory-2026-10-19.json). Native and application token inventories are different; the two counts are not interchangeable.

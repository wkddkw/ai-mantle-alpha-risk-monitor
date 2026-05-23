# AI Mantle Alpha & Risk Monitor

Read-only AI risk monitor for Mantle ecosystem targets, built for The Turing Test Hackathon 2026.

## Safety Boundary

- No wallet connection
- No custody or trading
- No private keys or seed phrases
- No local node installation
- No real funds required
- DeepSeek API key stays server-side in environment variables

## Features

- Accepts a protocol name, EVM address, or transaction hash.
- Uses Mantle RPC for live read-only address checks when an address is provided.
- Falls back to deterministic demo data for known Mantle ecosystem examples.
- Produces rule-based risk signals and an AI-readable report prompt.
- Uses DeepSeek only through the Next.js server API route when `DEEPSEEK_API_KEY` is configured.

## Environment

Create `.env.local` from `.env.example`:

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
MANTLE_RPC_URL=https://rpc.mantle.xyz
MANTLE_EXPLORER_URL=https://explorer.mantle.xyz
```

The app works without `DEEPSEEK_API_KEY`; it returns a deterministic fallback summary for the demo.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm test
npm run lint
npm run build
```

## Submission Notes

Repository naming suggestion:

```text
turing-test-hackathon-2026-ai-mantle-alpha-risk-monitor-[team-name]
```

Demo video should show:

1. Open the dashboard.
2. Analyze `mETH` as a known Mantle ecosystem target.
3. Analyze an address without connecting a wallet.
4. Show the safety boundary and evidence-based output.
5. Explain that DeepSeek runs only on the server side after the key is configured.

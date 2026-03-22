# Chicanery

Menu bar app for macOS that prompts you every 15 minutes to log what you worked on.

## Requirements

- macOS
- [Bun](https://bun.sh)

## Setup

```bash
bun install
```

## Run

```bash
bun run dev
```

The app lives in the menu bar. There is no Dock icon. Quit from the menu bar icon.

## Usage

- The prompt appears automatically at each 15-minute clock boundary (e.g. 10:00, 10:15, 10:30)
- Right-click the menu bar icon to log manually, view today's entries, or change the interval
- Entries are stored locally at `~/Library/Application Support/chicanery/chicanery.db`

## Reset

```bash
rm ~/Library/Application\ Support/chicanery/chicanery.db
```

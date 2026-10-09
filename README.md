# Chicanery

Menu bar app for macOS that prompts you every 15 minutes to log what you worked on.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ErikLundb3rg/Chicanery/main/install.sh | bash
```

This clones the repo, builds everything, and installs **Chicanery.app** to `/Applications`. Bun is installed automatically if needed. Then just open it from Spotlight, Launchpad, or:

```bash
open /Applications/Chicanery.app
```

## Development

```bash
bun install
bun run dev
```

The app lives in the menu bar. There is no Dock icon. Quit from the menu bar icon.

## Usage

- The prompt appears automatically at each 15-minute clock boundary (e.g. 10:00, 10:15, 10:30)
- Right-click the menu bar icon to log manually, view today's entries, or change the interval
- Today's timeline places tasks on an hourly scale with proportional durations, labelled unlogged gaps, and overlapping tasks side by side. Use **Now** to jump to the current time.
- The timeline starts in **Compact** mode. Choose **Entire day** to fit the day in the window, or **Detailed** for larger task blocks. Hover over small blocks to see their details.
- Click a task in the timeline to edit its text, category, or start/end date and time, then choose **Save changes**.
- Task timers run in the main process and show a completion window even while the task window is hidden. After sleep or unlock, expired tasks complete and logging reminders catch up to the latest interval.
- Entries are stored locally at `~/Library/Application Support/chicanery/chicanery.db`

## Reset

```bash
rm ~/Library/Application\ Support/chicanery/chicanery.db
```

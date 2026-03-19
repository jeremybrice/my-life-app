# My Life App

A personal life management app that runs entirely on your device. Track your daily budget, set and monitor goals, build healthy routines, and count down to the milestones that matter most — all in one place.

## What It Does

**My Life App** brings together the things you track every day into a single dashboard:

- **Budget Tracker** — Set a monthly budget and see exactly where you stand each day. Your budget is divided into a daily allowance, and a color-coded balance tells you at a glance whether you're on track (green) or overspending (red). Log expenses by category and vendor, view spending history by month, and see breakdowns of where your money goes. Leftover budget carries forward to the next month automatically.

- **Life Milestone Countdown** — Pick a target date that matters to you — retirement, a milestone birthday, a financial goal — and see how many days remain front and center on your dashboard. A progress bar shows how far you've come.

- **Goals** — Track any kind of goal: financial targets, personal milestones, or anything else. Choose how to measure progress — a dollar amount, a target date, a percentage, or a simple status label. Filter by type or status and watch your progress build over time.

- **Health Routines** — Define recurring habits like running, meditation, or gym sessions. Set a weekly target (e.g., "3 times per week"), log completions, and track your streak. The app tells you which routines you're on track for this week and celebrates your consistency.

- **AI Assistant** — Type a natural language description like "I spent $12.50 at Starbucks today" and the app creates the expense entry for you. You can also snap a photo of a receipt and have it extracted automatically. The assistant always asks you to confirm before saving anything.

- **Notifications** — Get alerted when you overspend your daily budget, hit monthly spending thresholds, or when a milestone date is approaching. Works as push notifications where supported, with in-app banners as a fallback.

- **Data Backup** — Export all your data as a JSON file anytime. Import it on another device or browser to pick up where you left off.

## Your Data Stays on Your Device

My Life App is a Progressive Web App (PWA) that stores everything locally in your browser. There is no account to create, no cloud sync, and no server storing your information. Your budget, goals, health routines, and settings never leave your device unless you explicitly export them.

The only exception is the AI assistant, which sends your messages (and receipt photos, if you upload them) to the Claude API for processing. Photos are not stored — they're sent once for extraction and then discarded. You provide your own Claude API key in Settings.

## How to Use It

### Install the App

1. Open the app URL in any modern browser (Chrome, Safari, Firefox, or Edge)
2. Look for the browser's "Install" or "Add to Home Screen" option
3. Once installed, the app opens in its own window and works offline (except the AI assistant, which needs internet)

### Get Started

1. **Open Settings** — Tap the Settings tab and configure:
   - Your **birth date** and a **target date** with a label (e.g., "Retirement") to see your countdown on the dashboard
   - Your **monthly budget** amount
   - Your **Claude API key** if you want to use the AI assistant (get one from anthropic.com)

2. **Start Tracking Expenses** — Go to the Budget tab, set up your first month, and add expenses. Each entry needs a vendor name and amount. Category and description are optional.

3. **Set Some Goals** — Go to the Goals tab and create goals of any type. Pick the progress model that fits: a numeric target for savings goals, a percentage for completion-based goals, or a simple status label for anything else.

4. **Define Health Routines** — Go to the Health tab, create routines with a weekly frequency target, and start logging completions. Your streak will build as you stay consistent.

5. **Check Your Dashboard** — The Dashboard is your daily landing page. It shows your milestone countdown, today's budget status, goal progress, and routine adherence at a glance.

### Using the AI Assistant

1. Go to the AI Agent tab
2. Type something like "I spent $8 at Subway for lunch" or "coffee at Starbucks $5.50"
3. The assistant will parse your message and show you what it understood
4. Confirm to save the expense, or ask it to make changes first
5. You can also upload a receipt photo — the assistant will extract the details

### Notifications

After you've used the app for a bit, it will ask if you'd like to enable notifications. You can configure which alerts you receive in Settings:
- **Daily budget alerts** — when you've spent more than your daily allowance
- **Monthly threshold alerts** — when you've used 80%, 90%, or 100% of your monthly budget
- **Milestone alerts** — reminders at 30, 7, and 1 day before your target date

### Backing Up Your Data

Since all data lives in your browser, it's a good idea to back up regularly:
- Go to **Settings** and tap **Export Data** to download a backup file
- To restore, tap **Import Data** and select a previously exported file (this replaces all current data)

## Browser Support

Works on Chrome, Safari, Firefox, and Edge on both desktop and mobile. PWA installation is supported on most modern browsers. Some notification features may be limited on iOS Safari.

## Privacy

- No account required
- No data sent to any server (except AI assistant messages to the Claude API)
- Receipt photos are processed once and never stored
- Your API key is stored locally and only used for direct Claude API calls

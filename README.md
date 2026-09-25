# Dayline

Your to-dos and your calendar on one timeline. Dayline installs on your iPhone like an app, works offline, and can show your Google Calendar and Outlook events next to your tasks.

**What's inside**

- **Quick add in plain English** — type `Dentist fri 9am for 1h #personal !high` and the date, time, length, list and priority are filled in for you.
- **Today · Schedule · Upcoming · Lists** — Today shows what's due and what's next. Schedule is a timeline of your day, with your meetings and time-blocked tasks side by side. Upcoming covers the next two weeks.
- **Auto-plan** — one tap drops today's unscheduled tasks into the free time between your meetings, inside your work hours.
- **Drag to reschedule** — long-press a task block on the timeline and drag it.
- **Recurring tasks, subtasks, reminders, notes, tags, priorities.**
- **Google Calendar + Outlook** — see your events, send a task to your calendar in one tap, and keep it in sync in both directions.
- **Private and offline** — tasks are stored on your device. Nothing goes to a server.

---

## Step 1 — Put Dayline online (free, about 10 minutes)

GitHub Pages hosts Dayline for free at an `https://` address, which is what lets your iPhone install it and lets Google and Microsoft sign you in.

1. Sign in to (or create a free account at) [github.com](https://github.com).
2. Click **+** (top right) → **New repository**. Name it `dayline`, choose **Public**, then **Create repository**.
3. On the new repository page, click **uploading an existing file**. Unzip `dayline.zip` on your Mac, open the `dayline` folder, select **everything inside it** (`index.html`, `css`, `js`, `icons`, …) and drag it onto the page. When the upload finishes, click **Commit changes**.
   *Drag the contents, not the folder itself, so `index.html` is at the top level of the repository.*
4. Go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, then **Branch** to `main` and `/ (root)`. Click **Save**.
5. After a minute, the Pages screen shows **Your site is live at `https://YOUR-USERNAME.github.io/dayline/`**. That's your app's address.

> Free GitHub Pages requires a public repository, so the *code* is public. Your *tasks* are not — they live only on your devices.
> If you named the repository something other than `dayline`, use that name wherever this guide says `dayline`.

## Step 2 — Install it on your iPhone

1. Open your app address in **Safari**.
2. Tap **···** (bottom right), then **Share**.
3. Scroll down and tap **Add to Home Screen**.
4. Keep **Open as Web App** turned on, then tap **Add**.

From now on, open Dayline from its icon. It runs full-screen and works offline.

<a id="google"></a>

## Step 3 (optional) — Connect Google Calendar

About 15 minutes, once. After this, your Google events appear on Today and Schedule, and tasks you add to Google Calendar stay in sync.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with the Google account whose calendar you use.
2. **Create a project:** click the project picker at the top → **New project** → name it `Dayline` → **Create**. Make sure `Dayline` is selected at the top.
3. **Turn on the Calendar API:** search the console for **Google Calendar API** → **Enable**.
4. **Set up the sign-in screen:** search for **Google Auth Platform** (older menus call it *APIs & Services → OAuth consent screen*) → **Get started**.
   - App name `Dayline`, support email: yours → **Next**
   - Audience: **External** → **Next**
   - Contact information: your email → **Next** → agree to the policy → **Create**
5. **Add yourself as a tester:** **Audience** → **Test users** → **Add users** → your Gmail address → **Save**.
6. **Declare the permissions:** **Data Access** → **Add or remove scopes** → under *Manually add scopes* paste both lines below → **Add to table** → **Update** → **Save**.

   ```
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/calendar.calendarlist.readonly
   ```

7. **Create the client:** **Clients** → **Create client**
   - Application type: **Web application**, name: `Dayline`
   - **Authorized JavaScript origins:** `https://YOUR-USERNAME.github.io`
   - **Authorized redirect URIs:** `https://YOUR-USERNAME.github.io/dayline/` — exactly, including the final `/`. Dayline shows this address under **Settings → Calendars**, with a copy button.
   - Click **Create** and copy the **Client ID** (it ends in `.apps.googleusercontent.com`). You don't need the client secret.
8. **Give Dayline the Client ID**, either:
   - on your phone: **Settings → Calendars → Google Calendar** → paste it → **Save**; or
   - once for every device: in your GitHub repository, open `config.js`, click the pencil icon, paste the ID between the quotes after `googleClientId`, and click **Commit changes**.
9. In Dayline, tap **Connect Google Calendar** and choose your account. Google will say **"Google hasn't verified this app"** — that's expected for an app only you use. Tap **Continue**, allow calendar access, and you'll land back in Dayline.

**Good to know:** Google's browser sign-in lasts one hour. Dayline renews it when you open the app, so you may see a brief flash while it does. If Google ever asks you to approve access again, just continue.

<a id="outlook"></a>

## Step 4 (optional) — Connect Outlook (your Microsoft 365 work account)

About 15 minutes, once. It may also need a one-click approval from your Microsoft 365 administrator.

1. Go to [entra.microsoft.com](https://entra.microsoft.com) and sign in with your work account.
2. **Register the app:** **Entra ID → App registrations → New registration**
   - Name: `Dayline`
   - Supported account types: **Single tenant only** (your organization)
   - Redirect URI: choose **Single-page application (SPA)** and enter `https://YOUR-USERNAME.github.io/dayline/`
   - Click **Register**.
3. On the **Overview** page, copy the **Application (client) ID** and the **Directory (tenant) ID**.
4. **Add calendar permission:** **API permissions → Add a permission → Microsoft Graph → Delegated permissions** → search `Calendars.ReadWrite` → tick it → **Add permissions**.
5. **Approve it:** click **Grant admin consent for (your organization)** → **Yes**. Under Microsoft's current default settings, an administrator has to approve any app that reads calendars. If the button is greyed out, you're not an admin — ask whoever manages your Microsoft 365 to click it for the app named *Dayline*.
6. **Give Dayline the IDs:** **Settings → Calendars → Outlook** → paste the Application (client) ID and the Directory (tenant) ID → **Save**. You can also put them in `config.js` as `microsoftClientId` and `microsoftTenant`.
7. Tap **Connect Outlook** and sign in.

If **New registration** says you don't have access, your organization restricts app registrations. Ask your admin to do steps 2–5 and send you the two IDs.

**Good to know:** Microsoft keeps a browser-app sign-in for 24 hours. Dayline renews it quietly when you open the app.

---

## Using Dayline

| Where | What you can do |
| --- | --- |
| **+ button** | Quick add. Recognized words appear as chips under the text box. Tap a chip's × to keep that word in the title instead. |
| **Today** | Overdue and today's tasks, your next meeting or time block, and today's events. **Move to today** clears the overdue pile in one tap. |
| **Schedule** | A timeline of one day. **To plan** lists tasks without a time: tap **Plan** for suggested open slots, or **Auto-plan** to fill your free time. Long-press a task block to drag it. Tap an empty spot to add a task at that time. Swipe the week strip to change weeks. |
| **Upcoming** | The next 14 days with events, then later tasks by month. |
| **Lists** | Inbox plus your own lists. Typing `#listname` in quick add files a task there. |
| **Tap any task** | Date, time, length, repeat, reminder, priority, list, tags, subtasks, notes, and **Calendar**: add to Google Calendar, Outlook, or an .ics file. |

**Quick-add examples**

| Type this | You get |
| --- | --- |
| `Dentist fri 9am` | Friday at 9:00 AM |
| `Call Ana tomorrow 3-4pm` | Tomorrow, 3:00 PM for 1 hour |
| `Write aims for 90m` | A 90-minute block (plan it later) |
| `Stretch every weekday 7am` | Repeats Monday–Friday |
| `Team sync every mon, wed` | Repeats Mondays and Wednesdays |
| `Grant report due 10/15` | October 15 |
| `Book flights in 2 weeks` | Two weeks from today |
| `Email the IRB tonight` | Today at 8:00 PM |
| `Review draft #work !high` | Work list, high priority |

## How calendar syncing works

- Dayline shows events from the calendars you switch on under **Settings → Calendars**, from a week back to two months ahead. Meetings you declined are hidden.
- A task you add to a connected calendar becomes a linked event. Edit the task and the event updates. Move or rename the event in Google Calendar or Outlook and the task follows. Delete the task and the event is removed a few seconds later, so **Undo** still works.
- Recurring tasks become recurring events.
- If you're offline or your sign-in has expired, changes wait and sync the next time you're connected.
- **Settings → Put timed tasks on my calendar** adds every new task with a time automatically.
- Not connected? **Add to calendar** still opens Google Calendar or Outlook on the web with the event filled in, or gives you an `.ics` file.

## Reminders on iPhone

A web app can't wake your phone on a schedule, so Dayline's own reminders only appear while it's open. It also keeps a count badge on its icon once notifications are on. For reminders you can rely on, add the task to Google Calendar or Outlook: the event carries your reminder, and those apps deliver it.

## Your data

- Tasks are stored on the device — not in GitHub and not on any server. Your phone and your computer each keep their own copy.
- **Settings → Back up tasks** saves a file (on iPhone, choose **Save to Files**). **Restore from backup** loads it on any device.
- Calendar events travel directly between Google or Microsoft and your device.

## Updating the app

After you edit any file on GitHub, open `sw.js` and bump `VERSION` (for example to `dayline-v1.0.1`). Installed copies then download the update, and Dayline shows **A new version is ready → Update**.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Google: *Error 400: redirect_uri_mismatch* | The redirect URI in Google Cloud must match **Settings → Calendars** exactly, including `https://` and the final `/`. |
| Google: *Access blocked: Dayline has not completed the Google verification process* | Add your Gmail address under **Audience → Test users**. |
| Outlook: *Need admin approval*, AADSTS65001 or AADSTS90094 | An administrator needs to click **Grant admin consent** (Step 4.5). |
| Outlook: AADSTS50011 | The redirect URI doesn't match. It must be exactly your app address with the final `/`. |
| Outlook: AADSTS9002326 | The redirect URI was added as *Web*. In Entra → **Authentication**, remove it and add it under **Single-page application**. |
| Outlook: AADSTS50194 | Enter the **Directory (tenant) ID** in Settings. |
| Outlook: AADSTS700016 | The client ID doesn't belong to that tenant. Check both IDs. |
| A calendar pill says **refresh** | Tap it. Sign-ins expire (Google hourly, Microsoft daily). |
| Changes to files don't show up | Bump `VERSION` in `sw.js`, reopen Dayline and tap **Update**. |
| Blank screen after signing in on iPhone | Close Dayline from the app switcher and open it again. |

## Files

- `index.html`, `css/`, `js/` — the app
- `sw.js` — offline support
- `manifest.webmanifest`, `icons/` — what makes it installable
- `config.js` — your calendar client IDs (optional)
- `help.html` — this guide, inside the app

## Privacy and security

- No server, no analytics, no third-party scripts. Calendar sign-in tokens stay on your device.
- Client IDs are public identifiers, so it's fine for them to be in a public repository. Never commit a client secret — Dayline doesn't use one.
- Google labels the browser-only sign-in method Dayline uses as a legacy option. If Google ever retires it, the Google connection would need a small server. The one-tap **Add to Google Calendar** links would keep working either way.

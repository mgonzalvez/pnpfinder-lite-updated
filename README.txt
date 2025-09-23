# PnPFinder Lite (CSV Edition)

This project is tailored to your CSV headers from the Google Sheet backup. It:
- Proxies your published Google Sheet CSV through a Cloudflare Pages Function (`/functions/api/games.js`).
- Parses and renders cards on the front-end (`/public/app.js`) with filters in `/public/index.html`.
- Styling is in `/public/styles.css`.

## Deploy on Cloudflare Pages
1. Push this folder as a GitHub repo.
2. In Cloudflare Pages: Create Project -> Connect to Git.
   - Build command: *(leave blank)*
   - Output directory: `public`
3. Add an Environment Variable:
   - Key: `SHEET_CSV_URL`
   - Value: **your Google Sheet published CSV URL** (File -> Share -> Publish to web -> CSV)
4. Deploy. Add your custom domain in the project settings.

## CSV Header Mapping
These match your sheet exactly; if a header changes, update `public/app.js`:

- GAME TITLE -> Title
- DESIGNER
- PUBLISHER
- FREE OR PAID (normalized to: free, paid, name your price)
- PRICE (not used for filtering, shown via FREE OR PAID instead)
- NUMBER OF PLAYERS (parsed '1-4', '1+', '2 to 5', 'Solo', etc.)
- PLAYTIME (banded: short ≤30, medium ≤60, long >60)
- AGE RANGE
- THEME
- MAIN MECHANISM
- SECONDARY MECHANISM
- GAMEPLAY COMPLEXITY
- GAMEPLAY MODE
- GAME CATEGORY
- PNP CRAFTING CHALLENGE LEVEL
- ONE-SENTENCE SHORT DESCRIPTION
- GAME DESCRIPTION
- DOWNLOAD LINK (primary)
- SECONDARY DOWNLOAD LINK (alt)
- PRINT COMPONENTS
- OTHER COMPONENTS
- LANGUAGES
- RELEASE YEAR
- IMAGE (cover)
- CURATED LISTS
- REPORT DEAD LINK
- DATE ADDED

## Notes
- Filters available: text (title/designer/publisher), price type, players, playtime band, mechanism text, theme text, gameplay mode.
- Action buttons show the domain of each download link for clarity.
- If you later move from CSV to a database (Cloudflare D1), only the data source layer changes; the UI can stay.

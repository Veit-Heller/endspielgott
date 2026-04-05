# Bauernendspiel Trainer

Statische Schach-Webapp mit lokalem Stockfish-Worker und optionalen KI-Erklaerungen via Anthropic.

## Lokal starten

Da `stockfish.js` als Worker geladen wird, bitte mit einem lokalen Server starten:

```bash
npx serve .
```

Dann im Browser `http://localhost:3000` oeffnen.

## API-Key Optionen

- **Option A (empfohlen fuer Deploy):** `ANTHROPIC_API_KEY` als Vercel Environment Variable setzen.
- **Option B:** Key direkt im UI eingeben (wird im Browser gespeichert).

## Deploy ueber GitHub + Vercel

1. Projekt in ein GitHub-Repository pushen.
2. In Vercel ein neues Projekt importieren (aus dem GitHub-Repo).
3. In Vercel unter **Settings -> Environment Variables** setzen:
   - `ANTHROPIC_API_KEY=sk-ant-...`
4. Deploy ausloesen.

Danach laufen die Erklaerungen ueber `api/explain.js` serverseitig, statt den Key direkt im Browser-Request zu senden.

**Timeout:** Die Erklär-Route nutzt `maxDuration: 60` in `vercel.json`. Auf dem **Hobby**-Plan ist die harte Obergrenze für Serverless-Funktionen oft **10 Sekunden** — dann kann `FUNCTION_INVOCATION_TIMEOUT` trotzdem auftreten. In dem Fall **Vercel Pro** nutzen oder lokal mit `npx serve .` testen (ohne Vercel-Zeitlimit).

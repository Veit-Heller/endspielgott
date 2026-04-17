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

## Practice-Mode MVP

- Practice-Mode aktivieren ueber den Schalter "Practice-Mode Aktiv".
- Ziel: vollstaendige Trainingspartie gegen Tobold mit Move-Review und lokaler Session-Historie.
- Session wird in `localStorage` gespeichert (`endspielgott.practice.v1`).
- Practice-Link nutzt `practice=1` plus `fen/mode/rv/skill/diff/np` und optional `replay`.

### QA-Matrix (manuell)

- Partie starten -> Practice-Phase wechselt auf `playerTurn`.
- Spielerzug -> Phase `analyzing`, Coach-Zeile zeigt Analyse-Hinweis.
- Engine-Zug -> Phase wechselt zurueck auf `playerTurn`.
- Matt/Remis -> Phase `finished`, Stats W/D/L aktualisieren sich.
- Undo -> Phase bleibt/spingt auf `playerTurn`.
- "Gleiche Stellung" startet dieselbe Start-FEN neu.
- "Practice-Link" erzeugt URL mit identischen Kernparametern.
- Browser neu laden -> Session-Historie bleibt erhalten.
- API-Ausfall (`/api/explain`) blockiert Partiefortschritt nicht.

### Kleine Unit-Tests

- Testseite: `tests/practice-tests.html`
- Geprueft werden:
  - Router-Parameter (Share-Link / Replay)
  - Coach-Klassifikation + MoveReview
  - Session-State-Grundlogik

### Vercel Release-Checkliste

- `ANTHROPIC_API_KEY` in Vercel Environment Variables gesetzt.
- Deploy auf aktuellem Commit erfolgt.
- Practice-Mode im Deploy getestet:
  - Start/Retry/Next/Share
  - Session Save/Restore
  - Explain-Button (optional Deep Coach)

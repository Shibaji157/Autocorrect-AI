# NeuralType — AI Autocorrect Keyboard

A browser-based typing keyboard with real-time autocorrection, next-word predictions, and typing statistics. It runs entirely in the browser; no build step or package installation is required.

## Features

- Corrects common spelling mistakes as you finish a word.
- Predicts the next word using a built-in N-gram language model.
- Includes a virtual keyboard and supports physical keyboard input.
- Offers quick phrases, correction undo, and autocorrect toggle.
- Tracks typing statistics and key frequency, with copy and text export.
- Supports dark and light themes.

## Run locally

Open `index.html` in a modern browser. For local HTTP serving, run this command from the project directory:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploy

This is a static site and can be deployed from the repository root using Vercel or another static hosting provider. No build command is needed; serve `index.html` as the entry point.

## Project files

- `index.html` — page structure and keyboard layout
- `style.css` — responsive visual styling
- `app.js` — user interface and typing behavior
- `autocorrect.js` — typo correction engine
- `ngram-model.js` — language model and word predictions

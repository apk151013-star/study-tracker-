# IAS Journey

A local-first UPSC preparation planner built with React + Vite.

## Requirements
- Node.js 20.19+ or 22.12+ (includes npm)
- A modern browser

## Run on Windows
1. Install Node.js LTS from https://nodejs.org/ and restart VS Code / PowerShell.
2. Extract this project folder.
3. Open the folder in VS Code.
4. Open Terminal → New Terminal.
5. Run:
   ```bash
   npm install
   npm run dev
   ```
6. Open the local URL printed by Vite (usually http://localhost:5173).

## Deploy to Netlify
1. Push the project folder to a GitHub repository.
2. In Netlify, choose **Add new project → Import an existing project**.
3. Select the GitHub repository.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Deploy.

The included `netlify.toml` already configures these values.

## Current data behaviour
Tasks, completed sessions, breaks, preferences and extracted syllabus text are stored in this browser's localStorage. This is a single-device prototype: data does not sync between devices or users. Export your data regularly using Settings → Export backup.

## PDF notes
PDF text extraction is performed in your browser using PDF.js. Scanned/image-only PDFs need OCR; this starter detects that situation and tells you when extracted text is empty. No PDF is uploaded to a server.

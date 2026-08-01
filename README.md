# Codeblazar AI News

A static dashboard that turns selected AI-related X bookmarks into practical actions.

Current Singapore weather is loaded in the browser from Open-Meteo. The weather display remains hidden if the service is unavailable.

## Local preview

Run a local web server from this folder, then open the address it prints:

```sh
python -m http.server 8000
```

Dashboard data is loaded from the read-only `Codeblazar AI News API` workflow in n8n. Cards are sorted in the browser by `latestPostDate`, newest first.

## Files

- `index.html`: page structure and sharing metadata
- `styles.css`: responsive presentation
- `app.js`: filtering, sorting and rendering
- `assets/`: Codeblazar branding and local source icons with text fallbacks
- `data/bookmarks.json`: local sample data retained for reference
- `CNAME`: GitHub Pages custom domain

## Publishing

GitHub Pages deploys the site from `main` using the Pages workflow. The intended custom domain is `ainews.codeblazar.org`.

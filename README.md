# NYSEG Bill Analyzer

A client-side web application that parses NYSEG utility bills (PDFs), extracts rate and usage data, displays interactive charts, and exports to CSV.

**All processing happens in your browser. Your data never leaves your device.**

## Features

- Drag and drop PDF bill upload
- Extracts electricity and gas usage, rates, and costs
- Cost breakdown charts showing supply vs delivery fees vs taxes
- Cost per degree day analysis with weather normalization
- Effective all-in rate tracking with formulas
- Synchronized highlighting between all charts and data table
- CSV export with full bill details
- Account information extraction with total spend summary
- Fully client-side — no data leaves your device

## Usage

1. Visit the deployed site or run locally
2. Drag and drop your NYSEG PDF bills (or click to select)
3. View charts and data table
4. Export to CSV if needed

## Development

Requires [Bun](https://bun.sh/).

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the included workflow.

## Tech Stack

- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF parsing
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [KaTeX](https://katex.org/) - Math formula rendering
- [Bun](https://bun.sh/) - Build tooling and dev server

## License

MIT

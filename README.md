# Google Keep to Bear.app Converter

A Node.js script that converts Google Keep takeout data to markdown format compatible with Bear.app.

## Features

- Converts Google Keep HTML and JSON files to markdown
- Preserves note titles, content, and creation dates
- Converts Keep labels to Bear tags
- Handles attachments and images
- Processes nested folder structures
- Generates Bear-compatible markdown files

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

```bash
node keep-to-bear.js <input-directory> <output-directory>
```

### Example

```bash
node keep-to-bear.js ./Takeout/Keep ./bear-notes
```

## Google Keep Takeout Setup

1. Go to [Google Takeout](https://takeout.google.com/)
2. Select "Keep" from the list of services
3. Choose your export format and delivery method
4. Download and extract the takeout data
5. Locate the "Keep" folder in your extracted data

## Bear.app Import

1. Run the conversion script to generate markdown files
2. Open Bear.app on macOS
3. Go to `File` → `Import From` → `Markdown Folder`
4. Select the output directory created by this script
5. Bear will import all markdown files and preserve attachments

## File Structure

The script expects the following Google Keep takeout structure:
```
Takeout/
└── Keep/
    ├── Note1.json
    ├── Note1.html
    ├── Note2.json
    ├── Note2.html
    └── attachments/
```

The script generates:
```
bear-notes/
├── note-title-1.md
├── note-title-2.md
└── attachments/
    └── [copied images and files]
```

## Markdown Format

The generated markdown follows Bear.app conventions:

- Note titles become H1 headers
- Keep labels become Bear tags (e.g., `#work #important`)
- HTML content is converted to clean markdown
- Creation dates are preserved as metadata comments
- Attachments are copied and referenced properly

## Troubleshooting

- **Empty output**: Ensure your input directory contains Google Keep JSON/HTML files
- **Missing attachments**: Check that attachment files exist in the takeout data
- **Import issues**: Verify Bear.app can access the output directory

## Requirements

- Node.js 14 or higher
- macOS (for Bear.app import)

## Dependencies

- `cheerio`: HTML parsing and manipulation
- `fs-extra`: Enhanced file system operations
# Google Keep to Bear.app Converter

A TypeScript/Node.js application that converts Google Keep takeout data to markdown format compatible with Bear.app.

## Features

- Converts Google Keep HTML and JSON files to markdown
- Preserves note titles, content, and creation dates
- Converts Keep labels to Bear tags with YAML frontmatter
- Advanced label processing with nesting support (` - ` becomes `/`)
- Optional hashtag validation and escaping via Labels.txt
- Automatic date-prefixed titles for untitled notes
- Handles attachments and images
- Processes nested folder structures
- Generates Bear-compatible markdown files with metadata

## Installation

1. Clone or download this project
2. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```
3. Build the TypeScript project:
   ```bash
   pnpm run build
   ```

## Usage

After building the project, you can run the converter in several ways:

### Production Usage

```bash
# Using the built JavaScript
node dist/keep-to-bear.js <input-directory> <output-directory>

# Using the npm bin command
pnpm exec keep-to-bear <input-directory> <output-directory>

# Using the npm script
pnpm run start <input-directory> <output-directory>
```

### Development Usage

```bash
# Direct TypeScript execution (no build required)
pnpm run dev
```

### Examples

```bash
# Production
node dist/keep-to-bear.js ./Takeout/Keep ./bear-notes
pnpm exec keep-to-bear ./Takeout/Keep ./bear-notes

# Development (uses ./in and ./out directories by default)
pnpm run dev
```

## Google Keep Takeout Setup

1. Go to [Google Takeout](https://takeout.google.com/)
2. Select "Keep" from the list of services
3. Choose your export format and delivery method
4. Download and extract the takeout data
5. Locate the "Keep" folder in your extracted data

## Labels.txt Configuration (Optional)

The converter can use an optional `Labels.txt` file in your project root to validate and escape hashtags in your note content.

### Purpose
- Validates hashtags against your actual Google Keep labels
- Escapes invalid hashtags (adds backslash: `\#hashtag`) to prevent unwanted tag creation in Bear
- Preserves valid hashtags as-is for proper tagging

### Format
Create a `Labels.txt` file with your Google Keep labels, one per line:
```
Personal - Friends
Reference - Books
Reference - Travel
Creative - Design
Creative - Interior Design
Personal
Reference - Linux/Tech
Reference - Recipes
```

### How It Works
The converter transforms label names into potential hashtag formats and compares them:
- `Personal - Friends` → `#personal-friends`
- `Reference - Linux/Tech` → `#reference-linux-tech`
- Special characters are removed, spaces become hyphens, all lowercase

If a hashtag in your note content doesn't match any transformed label, it gets escaped to prevent creating unintended tags in Bear.

### Example
With the above Labels.txt:
- `#personal-friends` → stays as `#personal-friends` (valid)
- `#random-hashtag` → becomes `\#random-hashtag` (escaped)
- `#reference-books` → stays as `#reference-books` (valid)

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

## Output Format

The generated markdown follows Bear.app conventions with enhanced metadata:

### YAML Frontmatter
Each note includes YAML frontmatter with structured tags:
```yaml
---
tags:
  - 06-google-keep
  - 06-google-keep/personal
  - 06-google-keep/reference/books
---
```

### Features
- Note titles become H1 headers with automatic date prefixes for untitled notes
- Keep labels become nested Bear tags with `06-google-keep/` prefix
- Advanced label processing: labels with ` - ` create nested tags (e.g., "Personal - Friends" → `06-google-keep/personal/friends`)
- Labels containing `/` are converted to ` and ` to avoid nesting conflicts
- HTML content is converted to clean markdown using Turndown
- Creation dates are preserved as metadata comments
- Attachments are copied to output directory and properly referenced
- Images are embedded with `![](filename.jpg)` syntax
- Non-image attachments use link syntax `[filename.pdf](filename.pdf)`

### Sample Output
```markdown
---
tags:
  - 06-google-keep
  - 06-google-keep/personal/friends
---

# 2024-03-15 - Dinner Plans

Let's meet at the new restaurant downtown!

## Attachments

![](restaurant-photo.jpg)

<!-- Created: 2024-03-15T18:30:00.000Z -->
```

## Troubleshooting

- **Empty output**: Ensure your input directory contains Google Keep JSON/HTML files
- **Missing attachments**: Check that attachment files exist in the takeout data
- **Import issues**: Verify Bear.app can access the output directory

## Requirements

- Node.js 18 or higher (for ES2020 features)
- pnpm (recommended package manager)
- TypeScript 5.x (for development)
- macOS (for Bear.app import)

## Dependencies

### Runtime Dependencies
- `cheerio`: HTML parsing and manipulation
- `fs-extra`: Enhanced file system operations
- `turndown`: HTML to Markdown conversion

### Development Dependencies
- `@types/fs-extra`: TypeScript types for fs-extra
- `@types/node`: Node.js TypeScript types
- `@types/turndown`: TypeScript types for Turndown
- `tsx`: TypeScript execution for development
- `typescript`: TypeScript compiler

## Development Workflow

1. **Setup**: `pnpm install`
2. **Development**: `pnpm run dev` (runs with tsx, no build needed)
3. **Build**: `pnpm run build` (compiles TypeScript to dist/)
4. **Production**: `pnpm run start <input> <output>` or `pnpm exec keep-to-bear <input> <output>`
5. **Clean**: `pnpm run clean` (removes dist/ directory)
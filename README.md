# Keep Import

A command-line tool to convert Google Keep notes to Bear app markdown format.

## � AI-Generated Code Warning

**This project was completely written by AI and has not been reviewed by humans.** Use at your own risk. The code may contain bugs, security vulnerabilities, or other issues. Please thoroughly review and test before using with important data.

I had the bot slop this out, and I didn't read any of the output. It worked for me, but it's specifically written for me and my data. Use at your own risk.

## Description

This tool processes Google Keep exports (from Google Takeout) and converts them to markdown files compatible with Bear app. It preserves note content, labels, attachments, and creation dates while organizing everything with Bear's hashtag system.

## Features

- Converts Keep JSON metadata and HTML content to markdown
- Preserves attachments (images and files)
- Creates Bear-compatible hashtag structure (`#06-google-keep/label-name`)
- Handles label validation to prevent hashtag conflicts
- Adds creation date metadata
- Progress tracking during conversion
- Batch processing of multiple notes

## Prerequisites

- Node.js (version 18 or higher recommended)
- pnpm package manager

## Setup

1. Clone or download this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the project:
   ```bash
   pnpm run build
   ```

## Usage

### Basic Usage

```bash
pnpm start <input-directory> <output-directory>
```

### Example

```bash
pnpm start ./Takeout/Keep ./bear-notes
```

### Development Mode
We don't do that here, this was tested in prod.

### Optional: Label Validation

If you put a `Labels.txt` file in the project root, the script will use this to process your tags from the keep data. This file can be found in your takeout data

Without this file, all hashtags will be escaped to prevent Bear conflicts.

## Input Format

The tool expects Google Keep export data from Google Takeout:
- JSON files containing note metadata
- Corresponding HTML files with note content
- Attachment files referenced in the metadata

## Output Format

Generated markdown files include:
- Title with creation date prefix
- Bear hashtags (`#06-google-keep` and label-based tags)
- Converted content from HTML to markdown
- Attachment references
- Creation date metadata

## Commands

- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm start` - Run the compiled tool
- `pnpm run dev` - Run in development mode with test directories
- `pnpm run clean` - Remove compiled files

## License

MIT
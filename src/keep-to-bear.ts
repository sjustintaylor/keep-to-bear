#!/usr/bin/env node

import * as fs from "fs-extra";
import * as path from "path";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { KeepNote } from "./types";

export class KeepToBearConverter {
  private inputDir: string;
  private outputDir: string;
  private validLabels: Set<string> = new Set();

  constructor(inputDir: string, outputDir: string) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
  }

  async convert(): Promise<void> {
    console.log("Starting Google Keep to Bear conversion...");

    // Load valid labels from Labels.txt
    await this.loadValidLabels();

    // Ensure output directory exists
    await fs.ensureDir(this.outputDir);

    // Find all JSON files in input directory
    const jsonFiles = await this.findFiles(this.inputDir, ".json");
    console.log(`Found ${jsonFiles.length} notes to convert`);

    let converted = 0;
    for (const jsonFile of jsonFiles) {
      try {
        await this.convertNote(jsonFile);
        converted++;
        console.log(`Converted: ${path.basename(jsonFile, ".json")}`);
      } catch (error) {
        console.error(
          `Error converting ${jsonFile}:`,
          (error as Error).message
        );
      }
    }

    console.log(
      `Conversion complete! Converted ${converted} out of ${jsonFiles.length} notes.`
    );
    console.log(`Output directory: ${this.outputDir}`);
  }

  private async loadValidLabels(): Promise<void> {
    const labelsFilePath = path.join(process.cwd(), "Labels.txt");

    if (await fs.pathExists(labelsFilePath)) {
      const content = await fs.readFile(labelsFilePath, "utf8");
      const lines = content.split("\n");

      for (const line of lines) {
        const match = line.match(/^\s*\d+→(.+)$/);
        if (match && match[1].trim()) {
          this.validLabels.add(match[1].trim());
        }
      }

      console.log(
        `Loaded ${this.validLabels.size} valid labels from Labels.txt`
      );
    } else {
      console.warn("Labels.txt not found, no hashtags will be escaped");
    }
  }

  private async findFiles(dir: string, extension: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        const subFiles = await this.findFiles(fullPath, extension);
        files.push(...subFiles);
      } else if (path.extname(item) === extension) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async convertNote(jsonFilePath: string): Promise<void> {
    // Read JSON metadata
    const jsonData = await this.parseJsonFile(jsonFilePath);

    // Find corresponding HTML file
    const htmlFilePath = jsonFilePath.replace(".json", ".html");
    const htmlExists = await fs.pathExists(htmlFilePath);

    let content = "";
    if (htmlExists) {
      content = await this.parseHtmlFile(htmlFilePath);
    }

    // Copy attachments if any and get list of copied files
    const copiedAttachments = await this.copyAttachments(
      jsonFilePath,
      jsonData
    );

    // Generate markdown
    const markdown = this.generateMarkdown(
      jsonData,
      content,
      copiedAttachments
    );

    // Create output filename
    const outputFileName = this.generateFileName(jsonData);
    const outputPath = path.join(this.outputDir, outputFileName);

    // Write markdown file
    await fs.writeFile(outputPath, markdown, "utf8");
  }

  private async parseJsonFile(filePath: string): Promise<KeepNote> {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as KeepNote;
  }

  private async parseHtmlFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, "utf8");
    const $ = cheerio.load(content);

    // Remove unwanted elements
    $("style, script").remove();

    // Get just the body content for conversion
    const bodyContent = $("body").html() || "";
    return this.htmlToMarkdown(bodyContent);
  }

  private escapeInvalidHashtags(content: string): string {
    // Find all hashtags in the content (word boundaries, alphanumeric + hyphens/underscores)
    return content.replace(/#[\w-]+/g, (match) => {
      const hashtag = match.slice(1); // Remove the # symbol

      // Check if this hashtag corresponds to any valid label
      const isValidLabel = Array.from(this.validLabels).some((label) => {
        // Convert label to potential hashtag format (lowercase, spaces to hyphens)
        const labelAsHashtag = label
          .replace(/[^a-zA-Z0-9\s-]/g, "") // Remove special chars except spaces and hyphens
          .replace(/\s+/g, "-") // Replace spaces (including multiple) with single hyphens
          .replace(/-+/g, "-") // Collapse multiple hyphens into single hyphen
          .toLowerCase();

        return labelAsHashtag === hashtag.toLowerCase();
      });

      // If it's not a valid label, escape the hashtag
      return isValidLabel ? match : `\\${match}`;
    });
  }

  private htmlToMarkdown(htmlContent: string): string {
    // Configure Turndown service
    const turndownService = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
    });

    // Remove style and script tags completely
    turndownService.remove(["style", "script"]);

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(htmlContent).trim();

    // Escape hashtags that don't correspond to valid labels
    return this.escapeInvalidHashtags(markdown);
  }

  private generateHashtags(jsonData: KeepNote): string[] {
    const hashtags = ["#06-google-keep"];

    if (jsonData.labels && jsonData.labels.length > 0) {
      const labelHashtags = jsonData.labels
        .map((label) => label.name)
        .filter((name): name is string => Boolean(name && name.trim()))
        .map((name) => {
          // First replace any existing "/" with " and " to avoid nesting conflicts
          let processedName = name.replace(/\//g, " and ");
          // Then handle " - " (dash with spaces) by converting to "-" for hashtags
          processedName = processedName.replace(/ - /g, "-");
          // Finally replace spaces with hyphens and make lowercase
          const hashtagName = processedName.replace(/\s+/g, "-").toLowerCase();
          return `#${hashtagName}`;
        });

      hashtags.push(...labelHashtags);
    }

    return hashtags;
  }

  private generateDisplayTitle(jsonData: KeepNote): string {
    // Extract creation date from timestamp
    let datePrefix = "Unknown Date";
    if (jsonData.createdTimestampUsec) {
      const createdDate = new Date(
        parseInt(jsonData.createdTimestampUsec) / 1000
      );
      datePrefix = createdDate.toISOString().split("T")[0]; // YYYY-MM-DD format
    }

    // If note has a title, combine with date
    if (jsonData.title && jsonData.title.trim()) {
      return `${datePrefix} - ${jsonData.title.trim()}`;
    }

    // If no title, add time component for uniqueness (HH.MM format)
    if (jsonData.createdTimestampUsec) {
      const createdDate = new Date(
        parseInt(jsonData.createdTimestampUsec) / 1000
      );
      const hours = createdDate.getHours().toString().padStart(2, "0");
      const minutes = createdDate.getMinutes().toString().padStart(2, "0");
      return `${datePrefix}.${hours}.${minutes}`;
    }

    return datePrefix;
  }

  private generateMarkdown(
    jsonData: KeepNote,
    content: string,
    copiedAttachments: string[] = []
  ): string {
    let markdown = "";

    // Always add title with date prefix
    const displayTitle = this.generateDisplayTitle(jsonData);
    const escapedTitle = this.escapeInvalidHashtags(displayTitle);
    markdown += `# ${escapedTitle}\n\n`;

    // Add hashtags under the title
    const hashtags = this.generateHashtags(jsonData);
    if (hashtags.length > 0) {
      markdown += `${hashtags.join(" ")}\n\n`;
    }

    // Add content
    if (content && content.trim()) {
      markdown += content.trim() + "\n\n";
    }

    // Add image references for copied attachments
    if (copiedAttachments.length > 0) {
      markdown += "## Attachments\n\n";
      for (const fileName of copiedAttachments) {
        const isImage = /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(fileName);
        if (isImage) {
          markdown += `![](${fileName})\n\n`;
        } else {
          markdown += `[${fileName}](${fileName})\n\n`;
        }
      }
    }

    // Add creation date as metadata comment
    if (jsonData.createdTimestampUsec) {
      const createdDate = new Date(
        parseInt(jsonData.createdTimestampUsec) / 1000
      );
      markdown += `<!-- Created: ${createdDate.toISOString()} -->\n`;
    }

    return markdown.trim();
  }

  private generateFileName(jsonData: KeepNote): string {
    let fileName = "";

    // Use title if available, otherwise use timestamp
    if (jsonData.title && jsonData.title.trim()) {
      fileName = jsonData.title
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .toLowerCase();
    } else if (jsonData.createdTimestampUsec) {
      const date = new Date(parseInt(jsonData.createdTimestampUsec) / 1000);
      fileName = date.toISOString().split("T")[0] + "-note";
    } else {
      fileName = "untitled-note";
    }

    // Ensure unique filename
    fileName = fileName.substring(0, 50); // Limit length
    return `${fileName}.md`;
  }

  private async copyAttachments(
    jsonFilePath: string,
    jsonData: KeepNote
  ): Promise<string[]> {
    const copiedFiles: string[] = [];

    if (!jsonData.attachments || jsonData.attachments.length === 0) {
      return copiedFiles;
    }

    const baseDir = path.dirname(jsonFilePath);
    const attachmentsDir = this.outputDir;
    await fs.ensureDir(attachmentsDir);

    for (const attachment of jsonData.attachments) {
      if (attachment.filePath) {
        const sourcePath = path.join(baseDir, attachment.filePath);
        const fileName = path.basename(attachment.filePath);
        const destinationPath = path.join(attachmentsDir, fileName);

        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, destinationPath);
          copiedFiles.push(fileName);
        }
      }
    }

    return copiedFiles;
  }
}

// CLI interface
function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "Usage: node keep-to-bear.js <input-directory> <output-directory>"
    );
    console.log("");
    console.log("Example:");
    console.log("  node keep-to-bear.js ./Takeout/Keep ./bear-notes");
    process.exit(1);
  }

  const inputDir = path.resolve(args[0]);
  const outputDir = path.resolve(args[1]);

  // Validate input directory
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  const converter = new KeepToBearConverter(inputDir, outputDir);
  converter.convert().catch((error: Error) => {
    console.error("Conversion failed:", error);
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

export default KeepToBearConverter;

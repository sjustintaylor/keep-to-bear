#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

class KeepToBearConverter {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
  }

  async convert() {
    console.log("Starting Google Keep to Bear conversion...");

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
        console.error(`Error converting ${jsonFile}:`, error.message);
      }
    }

    console.log(
      `Conversion complete! Converted ${converted} out of ${jsonFiles.length} notes.`
    );
    console.log(`Output directory: ${this.outputDir}`);
  }

  async findFiles(dir, extension) {
    const files = [];
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

  async convertNote(jsonFilePath) {
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

  async parseJsonFile(filePath) {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  }

  async parseHtmlFile(filePath) {
    const content = await fs.readFile(filePath, "utf8");
    const $ = cheerio.load(content);

    // Extract text content and convert basic HTML to markdown
    return this.htmlToMarkdown($);
  }

  htmlToMarkdown($) {
    // Remove unwanted elements
    $("style, script").remove();

    let markdown = "";

    // Process the body content
    $("body")
      .contents()
      .each((i, elem) => {
        const $elem = $(elem);

        if (elem.type === "text") {
          markdown += $elem.text().trim();
        } else if (elem.tagName) {
          switch (elem.tagName.toLowerCase()) {
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
              const level = parseInt(elem.tagName.substring(1));
              markdown +=
                "#".repeat(level) + " " + $elem.text().trim() + "\n\n";
              break;
            case "p":
              markdown += $elem.text().trim() + "\n\n";
              break;
            case "br":
              markdown += "\n";
              break;
            case "ul":
            case "ol":
              markdown += this.processList($elem, elem.tagName === "ol") + "\n";
              break;
            case "a":
              const href = $elem.attr("href");
              const text = $elem.text().trim();
              markdown += href ? `[${text}](${href})` : text;
              break;
            case "strong":
            case "b":
              markdown += `**${$elem.text().trim()}**`;
              break;
            case "em":
            case "i":
              markdown += `*${$elem.text().trim()}*`;
              break;
            case "img":
              const src = $elem.attr("src");
              const alt = $elem.attr("alt") || "Image";
              if (src) {
                const filename = path.basename(src);
                markdown += `![](${filename})`;
              }
              break;
            case "div":
              markdown += $elem.text().trim() + "\n";
              break;
            default:
              markdown += $elem.text().trim();
          }
        }
      });

    return markdown.replace(/\n{3,}/g, "\n\n").trim();
  }

  processList($list, isOrdered = false) {
    let result = "";
    $list.children("li").each((i, li) => {
      const $li = $(li);
      const prefix = isOrdered ? `${i + 1}. ` : "- ";
      result += prefix + $li.text().trim() + "\n";
    });
    return result;
  }

  generateMarkdown(jsonData, content, copiedAttachments = []) {
    let markdown = "";

    // Add YAML frontmatter for tags
    let yamlTags = ["06-google-keep"];

    if (jsonData.labels && jsonData.labels.length > 0) {
      const labelTags = jsonData.labels
        .map((label) => label.name)
        .filter((name) => name && name.trim())
        .map((name) => {
          // First replace any existing "/" with " & " to avoid nesting conflicts
          let processedName = name.replace(/\//g, " & ");
          // Then handle " - " (dash with spaces) by converting to "/" for nesting
          processedName = processedName.replace(/ - /g, "/");
          // Finally replace spaces with hyphens and make lowercase
          return processedName.replace(/\s+/g, "-").toLowerCase();
        });

      yamlTags.push(...labelTags);
    }

    // Generate YAML frontmatter
    markdown += "---\n";
    markdown += "tags:\n";
    for (const tag of yamlTags) {
      markdown += `  - ${tag}\n`;
    }
    markdown += "---\n\n";

    // Add title if available
    if (jsonData.title && jsonData.title.trim()) {
      markdown += `# ${jsonData.title.trim()}\n\n`;
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

  generateFileName(jsonData) {
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

  async copyAttachments(jsonFilePath, jsonData) {
    const copiedFiles = [];

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
function main() {
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
  converter.convert().catch((error) => {
    console.error("Conversion failed:", error);
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = KeepToBearConverter;

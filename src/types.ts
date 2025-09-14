export interface KeepLabel {
  name: string;
}

export interface KeepAttachment {
  filePath: string;
  mimetype?: string;
}

export interface KeepNote {
  title?: string;
  createdTimestampUsec?: string;
  labels?: KeepLabel[];
  attachments?: KeepAttachment[];
}

export interface ConversionOptions {
  inputDir: string;
  outputDir: string;
}
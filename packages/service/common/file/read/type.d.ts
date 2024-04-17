import {DatasetSchemaType} from "@fastgpt/global/core/dataset/type";

export type ReadFileByBufferParams = {
  teamId: string;
  buffer: Buffer;
  encoding: string;
  metadata?: Record<string, any>;
  dataset?: DatasetSchemaType;
  preview?: boolean;
};

export type ReadFileResponse = {
  rawText: string;
  formatText?: string;
  metadata?: Record<string, any>;
};

export type ReadMultimodalFileResponse = {
  rawText: string[];
  formatText?: string[];
  metadata?: Record<string, any>;
}
import { ReadFileByBufferParams } from '../../common/file/read/type';
import {DatasetSchemaType} from "@fastgpt/global/core/dataset/type";

export type ReadRawTextProps<T> = {
  extension: string;
  buffer: T;
  encoding: string;
  preview?: boolean;
  teamId: string;
  metadata?: Record<string, any>;
};

export type ReadRawTextByBuffer = ReadRawTextProps<Buffer>;

export type ReadFileResponse = {
  rawText: string;
  formatText?: string;
  metadata?: Record<string, any>;
};

import { markdownProcess } from '@fastgpt/global/common/string/markdown';
import { uploadMongoImg } from '../image/controller';
import { MongoImageTypeEnum } from '@fastgpt/global/common/file/image/constants';
import { addHours } from 'date-fns';

import { WorkerNameEnum, runWorker } from '../../../worker/utils';
import fs from 'fs';
import { detectFileEncoding } from '@fastgpt/global/common/file/tools';
import { ReadFileResponse } from '../../../worker/file/type';
import {DatasetSchemaType} from "@fastgpt/global/core/dataset/type";
import {initPdfText} from "../../../worker/file/extension/unstructured";

export const initMarkdownText = ({
  teamId,
  md,
  metadata
}: {
  md: string;
  teamId: string;
  metadata?: Record<string, any>;
}) =>
  markdownProcess({
    rawText: md,
    uploadImgController: (base64Img) =>
      uploadMongoImg({
        type: MongoImageTypeEnum.collectionImage,
        base64Img,
        teamId,
        metadata,
        expiredTime: addHours(new Date(), 2)
      })
  });

export type readRawTextByLocalFileParams = {
  teamId: string;
  path: string;
  metadata?: Record<string, any>;
};
export const readRawTextByLocalFile = async (params: readRawTextByLocalFileParams) => {
  const { path } = params;

  const extension = path?.split('.')?.pop()?.toLowerCase() || '';

  const buffer = fs.readFileSync(path);
  const encoding = detectFileEncoding(buffer);

  const { rawText } = await readRawContentByFileBuffer({
    extension,
    isQAImport: false,
    teamId: params.teamId,
    encoding,
    buffer,
    metadata: params.metadata
  });

  return {
    rawText
  };
};

export const readRawContentByFileBuffer = async ({
  extension,
  isQAImport,
  teamId,
  buffer,
  encoding,
  metadata,
    dataset
}: {
  isQAImport?: boolean;
  extension: string;
  teamId: string;
  buffer: Buffer;
  encoding: string;
  metadata?: Record<string, any>;
  dataset?: DatasetSchemaType;
}) => {
  let result = await runWorker<ReadFileResponse>(WorkerNameEnum.readFile, {
    extension,
    encoding,
    buffer,
    metadata,
    teamId,
    dataset
  });

  // pdf image query
  if (['pdf'].includes(extension)) {
    result.rawText = await initPdfText({
      teamId: teamId,
      metadata: metadata,
      dataset: dataset,
      pageElements: result.metadata? result.metadata["elements"] : []
    });
  }

  // markdown data format
  if (['md', 'html', 'docx'].includes(extension)) {
    result.rawText = await initMarkdownText({
      teamId: teamId,
      md: result.rawText,
      metadata: metadata
    });
  }

  if (['csv', 'xlsx'].includes(extension)) {
    // qa data
    if (isQAImport) {
      result.rawText = result.rawText || '';
    } else {
      result.rawText = result.formatText || '';
    }
  }

  const {rawText} = result;
  return { rawText };
};

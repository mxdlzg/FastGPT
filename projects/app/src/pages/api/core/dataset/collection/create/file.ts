import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import {
  delFileByFileIdList, getFileById,
} from '@fastgpt/service/common/file/gridfs/controller';
import { authDataset } from '@fastgpt/service/support/permission/auth/dataset';
import { FileIdCreateDatasetCollectionParams } from '@fastgpt/global/core/dataset/api';
import { createOneCollection } from '@fastgpt/service/core/dataset/collection/controller';
import {
  DatasetCollectionTypeEnum,
  TrainingModeEnum
} from '@fastgpt/global/core/dataset/constants';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import {BucketNameEnum} from "@fastgpt/global/common/file/constants";
import {MongoRwaTextBuffer} from "@fastgpt/service/common/buffer/rawText/schema";
import {generateFileChunk} from "@/service/events/generateFileChunk";
import {addLog} from "@fastgpt/service/common/system/log";
import {fileQueue} from "@fastgpt/service/common/system/systemQueue"

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  const {
    fileId,
    trainingType = TrainingModeEnum.chunk,
    chunkSize = 512,
    chunkSplitter,
    qaPrompt,
    ...body
  } = req.body as FileIdCreateDatasetCollectionParams;

  try {
    await connectToDatabase();

    const { teamId, tmbId, dataset } = await authDataset({
      req,
      authToken: true,
      authApiKey: true,
      per: 'w',
      datasetId: body.datasetId
    });

    // 1. read filename (Without real content, in preview, just name)
    let filename = "";
    const fileBuffer = await MongoRwaTextBuffer.findOne({sourceId: fileId}).lean();
    if (fileBuffer) {
      filename = fileBuffer.metadata?.filename || ''
    } else {
      const file = await getFileById({bucketName: BucketNameEnum.dataset, fileId});
      filename = file?.filename || "";
    }

    if (filename == ""){
      throw new Error("Cannot find file in upload file cache!");
    }

    const collectionId = await mongoSessionRun(async (session) => {
      // 4. create collection
      const { _id: collectionId } = await createOneCollection({
        ...body,
        teamId,
        tmbId,
        type: DatasetCollectionTypeEnum.file,
        name: filename,
        fileId,
        metadata: {
          relatedImgId: fileId
        },

        // special metadata
        trainingType,
        chunkSize,
        chunkSplitter,
        qaPrompt,

        hashRawText: "",//hashStr(rawText),
        rawTextLength: 0,//rawText.length,
        session
      });
      return collectionId;
    });

    fileQueue.add(() => generateFileChunk({
      teamId,
      tmbId,
      fileId,
      dataset,
      chunkSize,
      trainingType,
      chunkSplitter,
      collectionId,
      qaPrompt
    }).then(()=>{
      addLog.info(`${filename} | generateFileChunk executed end.`);
    }));
    addLog.info(`${filename} | fileQueue added.`);

    jsonRes(res);
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error
    });
  }
}

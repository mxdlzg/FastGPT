import type {NextApiRequest, NextApiResponse} from 'next';
import {jsonRes} from '@fastgpt/service/common/response';
import {getUploadModel} from '@fastgpt/service/common/file/multer';
import {authDataset} from '@fastgpt/service/support/permission/auth/dataset';
import {FileCreateDatasetCollectionParams} from '@fastgpt/global/core/dataset/api';
import {removeFilesByPaths} from '@fastgpt/service/common/file/utils';
import {createOneCollection} from '@fastgpt/service/core/dataset/collection/controller';
import {DatasetCollectionTypeEnum, TrainingModeEnum} from '@fastgpt/global/core/dataset/constants';
import {getNanoid} from '@fastgpt/global/common/string/tools';
import {BucketNameEnum} from '@fastgpt/global/common/file/constants';
import {mongoSessionRun} from '@fastgpt/service/common/mongo/sessionRun';
import {NextAPI} from '@/service/middleware/entry';
import {addLog} from "@fastgpt/service/common/system/log";
import {fileQueue} from "@fastgpt/service/common/system/systemQueue";
import {generateFileChunk} from "@/service/events/generateFileChunk";

async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  /**
   * Creates the multer uploader
   */
  const upload = getUploadModel({
    maxSize: (global.feConfigs?.uploadFileMaxSize || 500) * 1024 * 1024
  });
  let filePaths: string[] = [];

  try {
    const { file, data, bucketName } = await upload.doUpload<FileCreateDatasetCollectionParams>(
        req,
        res,
        BucketNameEnum.dataset
    );
    filePaths = [file.path];

    if (!file || !bucketName) {
      throw new Error('file is empty');
    }

    const { teamId, tmbId, dataset } = await authDataset({
      req,
      authToken: true,
      authApiKey: true,
      per: 'w',
      datasetId: data.datasetId
    });

    const {
      trainingType = TrainingModeEnum.chunk,
      chunkSize = 512,
      chunkSplitter,
      qaPrompt
    } = data;
    const { fileMetadata, collectionMetadata, ...collectionData } = data;
    const collectionName = file.originalname;

    const relatedImgId = getNanoid();

    const collectionId = await mongoSessionRun(async (session) => {
      // 4. create collection
      const { _id: collectionId } = await createOneCollection({
        ...collectionData,
        name: collectionName,
        teamId,
        tmbId,
        type: DatasetCollectionTypeEnum.file,
        metadata: {
          ...collectionMetadata,
          relatedImgId: relatedImgId
        },

        // special metadata
        trainingType,
        chunkSize,
        chunkSplitter,
        qaPrompt,

        fileId: "",//fileId
        hashRawText: "",//hashStr(rawText),
        rawTextLength: 0,//rawText.length,
        session
      });
      return collectionId;
    });

    // Add to queue
    fileQueue.add(() => generateFileChunk({
      teamId,
      tmbId,
      dataset,
      chunkSize,
      trainingType,
      chunkSplitter,
      collectionId,
      qaPrompt,
      //Add
      file,
      bucketName,
      data
    }).then(() => {
      addLog.info(`${relatedImgId} | generateFileChunk executed end.`);
    }));
    addLog.info(`${relatedImgId} | fileQueue added.`);

    // TODO:: 异步没办法直接返回results，后续看是否需要修复
    jsonRes(res, {
      data: { collectionId, results: {} }
    });
  } catch (error) {
    removeFilesByPaths(filePaths);

    return Promise.reject(error);
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default NextAPI(handler);

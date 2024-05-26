import {readFileContentFromMongo, uploadFile} from "@fastgpt/service/common/file/gridfs/controller";
import {BucketNameEnum} from "@fastgpt/global/common/file/constants";
import {splitText2Chunks} from "@fastgpt/global/common/string/textSplitter";
import {TrainingModeEnum} from "@fastgpt/global/core/dataset/constants";
import {checkDatasetLimit} from "@fastgpt/service/support/permission/teamLimit";
import {predictDataLimitLength} from "@fastgpt/global/core/dataset/utils";
import {createTrainingUsage} from "@fastgpt/service/support/wallet/usage/controller";
import {UsageSourceEnum} from "@fastgpt/global/support/wallet/usage/constants";
import {getLLMModel, getVectorModel} from "@fastgpt/service/core/ai/model";
import {pushDataListToTrainingQueue} from "@fastgpt/service/core/dataset/training/controller";
import {MongoImage} from "@fastgpt/service/common/file/image/schema";
import {addLog} from "@fastgpt/service/common/system/log";
import {startTrainingQueue} from "@/service/core/dataset/training/utils";
import {DatasetSchemaType} from "@fastgpt/global/core/dataset/type";
import {mongoSessionRun} from "@fastgpt/service/common/mongo/sessionRun";
import {getNanoid, hashStr} from "@fastgpt/global/common/string/tools";
import {MongoDatasetCollection} from "@fastgpt/service/core/dataset/collection/schema";
import {removeFilesByPaths} from "@fastgpt/service/common/file/utils";
import {readRawTextByLocalFile} from "@fastgpt/service/common/file/read/utils";
import {FileType} from "@fastgpt/service/common/file/multer"
import metadata from "next/dist/server/typescript/rules/metadata";
import {FileCreateDatasetCollectionParams} from "@fastgpt/global/core/dataset/api";
import {fi} from "date-fns/locale";

export const generateFileChunk = async ({
                                            teamId,
                                            tmbId,
                                            dataset,
                                            chunkSize,
                                            trainingType,
                                            chunkSplitter,
                                            collectionId,
                                            qaPrompt,
    file,
    bucketName,
    data
                                        }: {
    teamId: string;
    tmbId: string;
    dataset: DatasetSchemaType;
    chunkSize: number;
    trainingType: TrainingModeEnum;
    chunkSplitter: string | undefined;
    collectionId: string;
    qaPrompt: string | undefined;
    file: FileType,
    bucketName: `${BucketNameEnum}`,
    data: FileCreateDatasetCollectionParams
}) => {
    let filePaths = [file.path];

    try {
        addLog.info(`${file.originalname} | generateFileChunk START.`)

        const { fileMetadata, collectionMetadata, ...collectionData } = data;
        const collectionName = file.originalname;

        const relatedImgId = getNanoid();

        // 1. read file
        const { rawText } = await readRawTextByLocalFile({
            teamId,
            path: file.path,
            metadata: {
                ...fileMetadata,
                relatedId: relatedImgId
            }
        });

        // 2. upload file
        const fileId = await uploadFile({
            teamId,
            tmbId,
            bucketName,
            path: file.path,
            filename: file.originalname,
            contentType: file.mimetype,
            metadata: fileMetadata
        });

        // 3. delete tmp file
        removeFilesByPaths(filePaths);

        // 2. split chunks
        const {chunks} = splitText2Chunks({
            text: rawText,
            chunkLen: chunkSize,
            overlapRatio: trainingType === TrainingModeEnum.chunk ? 0.2 : 0,
            customReg: chunkSplitter ? [chunkSplitter] : []
        });
        addLog.info(`${file.originalname} | splitText2Chunks End.`)


        // 3. auth limit
        await checkDatasetLimit({
            teamId,
            insertLen: predictDataLimitLength(trainingType, chunks)
        });

        await mongoSessionRun(async (session) => {
            //4. update collection hashRawText and rawTextLength
            const updateFields: Record<string, any> = {
                "hashRawText": hashStr(rawText),
                "fileId": fileId,
                "rawTextLength": rawText.length,
            };
            await MongoDatasetCollection.findByIdAndUpdate(collectionId, {
                $set: updateFields
            },session);
            addLog.info(`${file.originalname} | putDatasetCollectionById End.`)

            // 5. create training bill
            const {billId} = await createTrainingUsage({
                teamId,
                tmbId,
                appName: collectionName,
                billSource: UsageSourceEnum.training,
                vectorModel: getVectorModel(dataset.vectorModel)?.name,
                agentModel: getLLMModel(dataset.agentModel)?.name,
                session
            });
            addLog.info(`${file.originalname} | createTrainingUsage End.`)

            // 6. insert to training queue
            const insertResults = await pushDataListToTrainingQueue({
                teamId,
                tmbId,
                datasetId: dataset._id,
                collectionId,
                agentModel: dataset.agentModel,
                vectorModel: dataset.vectorModel,
                trainingMode: trainingType,
                prompt: qaPrompt,
                billId,
                data: chunks.map((text, index) => ({
                    q: text,
                    chunkIndex: index
                })),
                session
            });
            addLog.info(`${file.originalname} | pushDataListToTrainingQueue End.`)

            // 7. remove related image ttl
            await MongoImage.updateMany(
                {
                    teamId,
                    'metadata.relatedId': relatedImgId
                },
                {
                    // Remove expiredTime to avoid ttl expiration
                    $unset: {
                        expiredTime: 1
                    }
                },
                {
                    session
                }
            );
            addLog.info(`${file.originalname} | mongoSessionRun End.`)
        });

        addLog.info(`${file.originalname} | startTrainingQueue.`)
        startTrainingQueue(true);
    } catch (error) {
        removeFilesByPaths(filePaths);
        addLog.error(`Async task: Load file ${file} content error!`, {error});
    }
}
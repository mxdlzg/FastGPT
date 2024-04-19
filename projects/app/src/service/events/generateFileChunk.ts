import {readFileContentFromMongo} from "@fastgpt/service/common/file/gridfs/controller";
import {BucketNameEnum} from "@fastgpt/global/common/file/constants";
import {splitText2Chunks} from "@fastgpt/global/common/string/textSplitter";
import {DatasetCollectionTypeEnum, TrainingModeEnum} from "@fastgpt/global/core/dataset/constants";
import {checkDatasetLimit} from "@fastgpt/service/support/permission/teamLimit";
import {predictDataLimitLength} from "@fastgpt/global/core/dataset/utils";
import {createTrainingUsage} from "@fastgpt/service/support/wallet/usage/controller";
import {UsageSourceEnum} from "@fastgpt/global/support/wallet/usage/constants";
import {getLLMModel, getVectorModel} from "@fastgpt/service/core/ai/model";
import {pushDataListToTrainingQueue} from "@fastgpt/service/core/dataset/training/controller";
import {MongoImage} from "@fastgpt/service/common/file/image/schema";
import {jsonRes} from "@fastgpt/service/common/response";
import {addLog} from "@fastgpt/service/common/system/log";
import {startTrainingQueue} from "@/service/core/dataset/training/utils";
import {DatasetSchemaType} from "@fastgpt/global/core/dataset/type";
import {ClientSession} from "@fastgpt/service/common/mongo";
import {mongoSessionRun} from "@fastgpt/service/common/mongo/sessionRun";
import {createOneCollection} from "@fastgpt/service/core/dataset/collection/controller";
import {putDatasetCollectionById} from "@/web/core/dataset/api";
import {hashStr} from "@fastgpt/global/common/string/tools";
import {MongoDatasetCollection} from "@fastgpt/service/core/dataset/collection/schema";
import {getCollectionUpdateTime} from "@fastgpt/service/core/dataset/collection/utils";

export const generateFileChunk = async ({
                                            teamId,
                                            tmbId,
                                            fileId,
                                            dataset,
                                            chunkSize,
                                            trainingType,
                                            chunkSplitter,
                                            collectionId,
                                            qaPrompt
                                        }: {
    teamId: string;
    tmbId: string;
    fileId: string;
    dataset: DatasetSchemaType;
    chunkSize: number;
    trainingType: `${TrainingModeEnum}`;
    chunkSplitter: string | undefined;
    collectionId: string;
    qaPrompt: string | undefined;
}) => {
    try {
        addLog.info(`${fileId} | generateFileChunk START.`)
        // 1. read file
        const {rawText, filename} = await readFileContentFromMongo({
            teamId,
            bucketName: BucketNameEnum.dataset,
            fileId
        });
        addLog.info(`${filename} | readFileContentFromMongo End.`)

        // 2. split chunks
        const {chunks} = splitText2Chunks({
            text: rawText,
            chunkLen: chunkSize,
            overlapRatio: trainingType === TrainingModeEnum.chunk ? 0.2 : 0,
            customReg: chunkSplitter ? [chunkSplitter] : []
        });
        addLog.info(`${filename} | splitText2Chunks End.`)


        // 3. auth limit
        await checkDatasetLimit({
            teamId,
            insertLen: predictDataLimitLength(trainingType, chunks)
        });

        await mongoSessionRun(async (session) => {
            //4. update collection hashRawText and rawTextLength
            const updateFields: Record<string, any> = {
                "hashRawText": hashStr(rawText),
                "rawTextLength": rawText.length,
            };
            await MongoDatasetCollection.findByIdAndUpdate(collectionId, {
                $set: updateFields
            },session);
            addLog.info(`${filename} | putDatasetCollectionById End.`)

            // 5. create training bill
            const {billId} = await createTrainingUsage({
                teamId,
                tmbId,
                appName: filename,
                billSource: UsageSourceEnum.training,
                vectorModel: getVectorModel(dataset.vectorModel)?.name,
                agentModel: getLLMModel(dataset.agentModel)?.name,
                session
            });
            addLog.info(`${filename} | createTrainingUsage End.`)

            // 6. insert to training queue
            await pushDataListToTrainingQueue({
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
            addLog.info(`${filename} | pushDataListToTrainingQueue End.`)

            // 7. remove related image ttl
            await MongoImage.updateMany(
                {
                    teamId,
                    'metadata.relatedId': fileId
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
            addLog.info(`${filename} | mongoSessionRun End.`)
        });

        addLog.info(`${filename} | startTrainingQueue.`)
        startTrainingQueue(true);
    } catch (error) {
        addLog.error(`Async task: Load file ${fileId} content error!`, {error});
    }
}
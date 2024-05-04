import type {
  LLMModelItemType,
  VectorModelItemType,
  AudioSpeechModels,
  WhisperModelType,
  ReRankModelItemType
} from '@fastgpt/global/core/ai/model.d';

import type { FastGPTFeConfigsType } from '@fastgpt/global/common/system/types/index.d';
import { SubPlanType } from '@fastgpt/global/support/wallet/sub/type';
import {UnstructuredEnvType} from "@fastgpt/service/core/dataset/unstructured/config";

export type InitDateResponse = {
  llmModels: LLMModelItemType[];
  vectorModels: VectorModelItemType[];
  audioSpeechModels: AudioSpeechModels[];
  reRankModels: ReRankModelItemType[];
  whisperModel: WhisperModelType;
  unstructuredConfigs: UnstructuredEnvType;
  feConfigs: FastGPTFeConfigsType;
  subPlans?: SubPlanType;
  systemVersion: string;
};

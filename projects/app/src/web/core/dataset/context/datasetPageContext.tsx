import { useQuery } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { createContext } from 'use-context-selector';
import { getDatasetTrainingQueue, getTrainingQueueLen } from '../api';
import { useDatasetStore } from '../store/dataset';

type DatasetPageContextType = {
  vectorTrainingMap: {
    colorSchema: string;
    tip: string;
    trainingCount: number;
    trainingPercentage: number;
  };
  agentTrainingMap: {
    colorSchema: string;
    tip: string;
    trainingCount: number;
    trainingPercentage: number;
  };
  fileQueueMap: {
    colorSchema: string;
    tip: string;
    trainingCount: number;
    trainingPercentage: number;
  };
  rebuildingCount: number;
  trainingCount: number;
  refetchDatasetTraining: () => void;
};

type DatasetPageContextValueType = {
  datasetId: string;
};

const MAX_VECTOR_QUEUE_SIZE = 2000;
const MAX_QA_QUEUE_SIZE = 500;
const MAX_FILE_QUEUE_SIZE = 50;

export const DatasetPageContext = createContext<DatasetPageContextType>({
  vectorTrainingMap: {
    colorSchema: '',
    tip: '',
    trainingCount: 0,
    trainingPercentage: 0
  },
  agentTrainingMap: {
    colorSchema: '',
    tip: '',
    trainingCount: 0,
    trainingPercentage: 0
  },
  fileQueueMap: {
    colorSchema: '',
    tip: '',
    trainingCount: 0,
    trainingPercentage: 0
  },
  rebuildingCount: 0,
  trainingCount: 0,
  refetchDatasetTraining: function (): void {
    throw new Error('Function not implemented.');
  }
});

export const DatasetPageContextProvider = ({
  children,
  value
}: {
  children: ReactNode;
  value: DatasetPageContextValueType;
}) => {
  const { t } = useTranslation();
  const { datasetId } = value;
  const { datasetDetail } = useDatasetStore();

  // global queue
  const { data: { vectorTrainingCount = 0, agentTrainingCount = 0, fileQueueCount = 0 } = {} } = useQuery(
    ['getTrainingQueueLen'],
    () =>
      getTrainingQueueLen({
        vectorModel: datasetDetail.vectorModel.model,
        agentModel: datasetDetail.agentModel.model
      }),
    {
      refetchInterval: 10000
    }
  );
  const { vectorTrainingMap, agentTrainingMap, fileQueueMap } = useMemo(() => {
    // vector training queue
    const vectorTrainingMap = (() => {
      let vectorPercentage = vectorTrainingCount > MAX_VECTOR_QUEUE_SIZE ? 0 : 100 - Math.round((vectorTrainingCount / MAX_VECTOR_QUEUE_SIZE) * 100);

      if (vectorPercentage > 80)
        return {
          trainingCount: vectorTrainingCount,
          trainingPercentage: vectorPercentage,
          colorSchema: 'green',
          tip: t('core.dataset.training.Leisure')
        };
      if (vectorPercentage > 50)
        return {
          trainingCount: vectorTrainingCount,
          trainingPercentage: vectorPercentage,
          colorSchema: 'yellow',
          tip: t('core.dataset.training.Waiting')
        };
      return {
        trainingCount: vectorTrainingCount,
        trainingPercentage: vectorPercentage,
        colorSchema: 'red',
        tip: t('core.dataset.training.Full')
      };
    })();

    // agent training queue
    const agentTrainingMap = (() => {
      let qaPercentage = agentTrainingCount > MAX_QA_QUEUE_SIZE ? 0 : 100 - Math.round((agentTrainingCount / MAX_QA_QUEUE_SIZE) * 100);
      if (qaPercentage > 80)
        return {
          trainingCount: agentTrainingCount,
          trainingPercentage: qaPercentage,
          colorSchema: 'green',
          tip: t('core.dataset.training.Leisure')
        };
      if (qaPercentage > 50)
        return {
          trainingCount: agentTrainingCount,
          trainingPercentage: qaPercentage,
          colorSchema: 'yellow',
          tip: t('core.dataset.training.Waiting')
        };
      return {
        trainingCount: agentTrainingCount,
        trainingPercentage: qaPercentage,
        colorSchema: 'red',
        tip: t('core.dataset.training.Full')
      };
    })();

    // file queue
    const fileQueueMap = (() => {
      let fileQueuePercentage = fileQueueCount > MAX_FILE_QUEUE_SIZE ? 0 : 100 - Math.round((fileQueueCount / MAX_FILE_QUEUE_SIZE) * 100);
      if (fileQueuePercentage > 80)
        return {
          trainingCount: fileQueueCount,
          trainingPercentage: fileQueuePercentage,
          colorSchema: 'green',
          tip: t('core.dataset.training.Leisure')
        };
      if (fileQueuePercentage > 50)
        return {
          trainingCount: fileQueueCount,
          trainingPercentage: fileQueuePercentage,
          colorSchema: 'yellow',
          tip: t('core.dataset.training.Waiting')
        };
      return {
        trainingCount: fileQueueCount,
        trainingPercentage: fileQueuePercentage,
        colorSchema: 'red',
        tip: t('core.dataset.training.Full')
      };
    })();

    return {
      vectorTrainingMap,
      agentTrainingMap,
      fileQueueMap
    };
  }, [agentTrainingCount, t, vectorTrainingCount, fileQueueCount]);

  // training and rebuild queue
  const { data: { rebuildingCount = 0, trainingCount = 0 } = {}, refetch: refetchDatasetTraining } =
    useQuery(['getDatasetTrainingQueue'], () => getDatasetTrainingQueue(datasetId), {
      refetchInterval: 10000
    });

  const contextValue: DatasetPageContextType = {
    vectorTrainingMap,
    agentTrainingMap,
    fileQueueMap,
    rebuildingCount,
    trainingCount,
    refetchDatasetTraining
  };

  return <DatasetPageContext.Provider value={contextValue}>{children}</DatasetPageContext.Provider>;
};

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import {Box, Flex, IconButton, useTheme, Progress, Tooltip} from '@chakra-ui/react';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import Tabs from '@/components/Tabs';
import dynamic from 'next/dynamic';
import MyIcon from '@fastgpt/web/components/common/Icon';
import SideTabs from '@/components/SideTabs';
import PageContainer from '@/components/PageContainer';
import Avatar from '@/components/Avatar';
import { serviceSideProps } from '@/web/common/utils/i18n';
import { useTranslation } from 'next-i18next';
import { getTrainingQueueLen } from '@/web/core/dataset/api';
import MyTooltip from '@/components/MyTooltip';
import CollectionCard from './components/CollectionCard';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { useUserStore } from '@/web/support/user/useUserStore';
import {
  DatasetStatusEnum,
  DatasetTypeEnum,
  DatasetTypeMap
} from '@fastgpt/global/core/dataset/constants';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import DatasetTypeTag from '@/components/core/dataset/DatasetTypeTag';
import Head from 'next/head';
import MyBox from '@fastgpt/web/components/common/MyBox';

const DataCard = dynamic(() => import('./components/DataCard'));
const Test = dynamic(() => import('./components/Test'));
const Info = dynamic(() => import('./components/Info'));
const Import = dynamic(() => import('./components/Import'));

export enum TabEnum {
  dataCard = 'dataCard',
  collectionCard = 'collectionCard',
  test = 'test',
  info = 'info',
  import = 'import'
}

const MAX_VECTOR_QUEUE_SIZE = 2000;
const MAX_QA_QUEUE_SIZE = 500;
const MAX_FILE_QUEUE_SIZE = 50;

const Detail = ({ datasetId, currentTab }: { datasetId: string; currentTab: `${TabEnum}` }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const { isPc } = useSystemStore();
  const { datasetDetail, loadDatasetDetail, startWebsiteSync } = useDatasetStore();
  const { userInfo } = useUserStore();

  const tabList = [
    {
      label: t('core.dataset.Collection'),
      id: TabEnum.collectionCard,
      icon: 'common/overviewLight'
    },
    { label: t('core.dataset.test.Search Test'), id: TabEnum.test, icon: 'kbTest' },
    ...(userInfo?.team.canWrite && datasetDetail.isOwner
      ? [{ label: t('common.Config'), id: TabEnum.info, icon: 'common/settingLight' }]
      : [])
  ];

  const { ConfirmModal: ConfirmSyncModal, openConfirm: openConfirmSync } = useConfirm({
    type: 'common'
  });

  const { mutate: onUpdateDatasetWebsiteConfig, isLoading: isUpdating } = useRequest({
    mutationFn: () => startWebsiteSync(),
    errorToast: t('common.Update Failed')
  });

  const setCurrentTab = useCallback(
    (tab: `${TabEnum}`) => {
      router.replace({
        query: {
          datasetId,
          currentTab: tab
        }
      });
    },
    [datasetId, router]
  );

  useQuery([datasetId], () => loadDatasetDetail(datasetId), {
    onError(err: any) {
      router.replace(`/dataset/list`);
      toast({
        title: t(getErrText(err, t('common.Load Failed'))),
        status: 'error'
      });
    }
  });

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
    const vectorTrainingMap = (() => {
      let vectorPercentage = vectorTrainingCount>MAX_VECTOR_QUEUE_SIZE? 0: 100 - Math.round((vectorTrainingCount / MAX_VECTOR_QUEUE_SIZE) * 100);

      if (vectorPercentage > 80)
        return {
          trainingCount: vectorTrainingCount,
          trainingPercentage: vectorPercentage,
          colorSchema: 'green',
          // tip: t('core.dataset.training.Leisure')
        };
      if (vectorPercentage > 50)
        return {
          trainingCount: vectorTrainingCount,
          trainingPercentage: vectorPercentage,
          colorSchema: 'yellow',
          // tip: t('core.dataset.training.Waiting')
        };
      return {
        trainingCount: vectorTrainingCount,
        trainingPercentage: vectorPercentage,
        colorSchema: 'red',
        // tip: t('core.dataset.training.Full')
      };
    })();
    const agentTrainingMap = (() => {
      let qaPercentage = agentTrainingCount>MAX_QA_QUEUE_SIZE? 0: 100 - Math.round((agentTrainingCount / MAX_QA_QUEUE_SIZE) * 100);
      if (qaPercentage > 80)
        return {
          trainingCount: agentTrainingCount,
          trainingPercentage: qaPercentage,
          colorSchema: 'green',
          // tip: t('core.dataset.training.Leisure')
        };
      if (qaPercentage > 50)
        return {
          trainingCount: agentTrainingCount,
          trainingPercentage: qaPercentage,
          colorSchema: 'yellow',
          // tip: t('core.dataset.training.Waiting')
        };
      return {
        trainingCount: agentTrainingCount,
        trainingPercentage: qaPercentage,
        colorSchema: 'red',
        // tip: t('core.dataset.training.Full')
      };
    })();
    const fileQueueMap = (() => {
      let fileQueuePercentage = fileQueueCount>MAX_FILE_QUEUE_SIZE? 0: 100 - Math.round((fileQueueCount / MAX_FILE_QUEUE_SIZE) * 100);
      if (fileQueuePercentage > 80)
        return {
          trainingCount: fileQueueCount,
          trainingPercentage: fileQueuePercentage,
          colorSchema: 'green',
          // tip: t('core.dataset.training.Leisure')
        };
      if (fileQueuePercentage > 50)
        return {
          trainingCount: fileQueueCount,
          trainingPercentage: fileQueuePercentage,
          colorSchema: 'yellow',
          // tip: t('core.dataset.training.Waiting')
        };
      return {
        trainingCount: fileQueueCount,
        trainingPercentage: fileQueuePercentage,
        colorSchema: 'red',
        // tip: t('core.dataset.training.Full')
      };
    })();
    return {
      vectorTrainingMap,
      agentTrainingMap,
      fileQueueMap
    };
  }, [agentTrainingCount, t, vectorTrainingCount, fileQueueCount]);

  return (
    <>
      <Head>
        <title>{datasetDetail?.name}</title>
      </Head>
      <PageContainer>
        <MyBox
          isLoading={isUpdating}
          display={'flex'}
          flexDirection={['column', 'row']}
          h={'100%'}
          pt={[4, 0]}
        >
          {isPc ? (
            <Flex
              flexDirection={'column'}
              py={4}
              h={'100%'}
              flex={'0 0 200px'}
              borderRight={theme.borders.base}
            >
              <Box px={4} borderBottom={'1px'} borderColor={'myGray.200'} pb={4} mb={4}>
                <Flex mb={4} alignItems={'center'}>
                  <Avatar src={datasetDetail.avatar} w={'34px'} borderRadius={'md'} />
                  <Box ml={2}>
                    <Box fontWeight={'bold'}>{datasetDetail.name}</Box>
                  </Box>
                </Flex>
                {DatasetTypeMap[datasetDetail.type] && (
                  <Flex alignItems={'center'} pl={2} justifyContent={'space-between'}>
                    <DatasetTypeTag type={datasetDetail.type} />
                    {datasetDetail.type === DatasetTypeEnum.websiteDataset &&
                      datasetDetail.status === DatasetStatusEnum.active && (
                        <MyTooltip label={t('core.dataset.website.Start Sync')}>
                          <MyIcon
                            mt={1}
                            name={'common/refreshLight'}
                            w={'12px'}
                            color={'myGray.500'}
                            cursor={'pointer'}
                            onClick={() =>
                              openConfirmSync(
                                onUpdateDatasetWebsiteConfig,
                                undefined,
                                t('core.dataset.website.Confirm Create Tips')
                              )()
                            }
                          />
                        </MyTooltip>
                      )}
                  </Flex>
                )}
              </Box>
              <SideTabs
                px={4}
                flex={1}
                mx={'auto'}
                w={'100%'}
                list={tabList}
                activeId={currentTab}
                onChange={(e: any) => {
                  setCurrentTab(e);
                }}
              />
              <Box px={4}>
                <Box mb={3}>
                  <Box fontSize={'sm'}>
                    {t('core.dataset.training.File queue')}({fileQueueMap.trainingCount})
                  </Box>
                  <Progress
                      value={fileQueueMap.trainingPercentage}
                      size={'xs'}
                      colorScheme={fileQueueMap.colorSchema}
                      borderRadius={'10px'}
                      isAnimated
                      hasStripe
                  />
                </Box>

                <Box mb={3}>
                  <Box fontSize={'sm'}>
                    {t('core.dataset.training.Agent queue')}({agentTrainingMap.trainingCount})
                  </Box>
                    <Progress
                        value={agentTrainingMap.trainingPercentage}
                        size={'xs'}
                        colorScheme={agentTrainingMap.colorSchema}
                        borderRadius={'10px'}
                        isAnimated
                        hasStripe
                    />
                </Box>

                <Box mb={3}>
                  <Box fontSize={'sm'}>
                    {t('core.dataset.training.Vector queue')}({vectorTrainingMap.trainingCount})
                  </Box>
                  <Progress
                    value={vectorTrainingMap.trainingPercentage}
                    size={'xs'}
                    colorScheme={vectorTrainingMap.colorSchema}
                    borderRadius={'10px'}
                    isAnimated
                    hasStripe
                  />
                </Box>
              </Box>

              <Flex
                alignItems={'center'}
                cursor={'pointer'}
                py={2}
                px={3}
                borderRadius={'md'}
                _hover={{ bg: 'myGray.100' }}
                onClick={() => router.replace('/dataset/list')}
              >
                <IconButton
                  mr={3}
                  icon={<MyIcon name={'common/backFill'} w={'18px'} color={'primary.500'} />}
                  bg={'white'}
                  boxShadow={'1px 1px 9px rgba(0,0,0,0.15)'}
                  size={'smSquare'}
                  borderRadius={'50%'}
                  aria-label={''}
                />
                {t('core.dataset.All Dataset')}
              </Flex>
            </Flex>
          ) : (
            <Box mb={3}>
              <Tabs
                m={'auto'}
                w={'260px'}
                size={isPc ? 'md' : 'sm'}
                list={tabList.map((item) => ({
                  id: item.id,
                  label: item.label
                }))}
                activeId={currentTab}
                onChange={(e: any) => setCurrentTab(e)}
              />
            </Box>
          )}

          {!!datasetDetail._id && (
            <Box flex={'1 0 0'} pb={0}>
              {currentTab === TabEnum.collectionCard && <CollectionCard />}
              {currentTab === TabEnum.dataCard && <DataCard />}
              {currentTab === TabEnum.test && <Test datasetId={datasetId} />}
              {currentTab === TabEnum.info && <Info datasetId={datasetId} />}
              {currentTab === TabEnum.import && <Import />}
            </Box>
          )}
        </MyBox>
      </PageContainer>
      <ConfirmSyncModal />
    </>
  );
};

export async function getServerSideProps(context: any) {
  const currentTab = context?.query?.currentTab || TabEnum.collectionCard;
  const datasetId = context?.query?.datasetId;

  return {
    props: { currentTab, datasetId, ...(await serviceSideProps(context)) }
  };
}

export default React.memo(Detail);

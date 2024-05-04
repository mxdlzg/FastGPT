import type {ChatCompletionContentPart, ChatCompletionMessageParam} from "@fastgpt/global/core/ai/type";
import {replaceVariable} from "@fastgpt/global/common/string/tools";
import {getAIApi} from "../config";
import {getLLMModel} from "../model";

export const Prompt_ImageDesc = `
请帮我分析这张图片，提取其中的内容和特征。
识别图中的主要对象和场景。提取图中的文本信息（如果有的话）。请分析并总结图像所表达的主要内容。
注意，请根据图片的语言返回相应的语言（比如英文图片使用英文回复，中文图片使用中文回复）
已知此图的一些信息为：{{rawText}}
`;
export const Prompt_ImageDesc_Eng = `Please help me analyze this picture and extract its content and features. 
Identify the main objects and scenes in the diagram. 
Extract the text information in the image (if any). 
Please analyze and summarize the main content expressed by the image. 
Note, please return the corresponding language according to the language of the picture (this picture is in English)
Some information known about this picture is: {{rawText}}`

export async function queryImageDescription({
        rawTex,
        image_base64,
        model,
        ai,
        language="eng"
    }: {
    rawTex: string;
    image_base64: string;
    model: string;
    ai: any
    language?: string;
}) {
    // 无"data:image/jpeg;base64,"开头的base64结构
    const glm4vReqContent: ChatCompletionContentPart[] = [
        {
            type: "text",
            text: replaceVariable( (language && language=="eng")?Prompt_ImageDesc_Eng:Prompt_ImageDesc, {
                "rawText": rawTex,
            })
        },
        {
            type: "image_url",
            image_url: {
                url: image_base64
            }
        }
    ]
    const concatMessages: ChatCompletionMessageParam[] = [
        {
            role: 'user',
            content: glm4vReqContent
        }
    ];

    const data = await ai.chat.completions.create({
        model: getLLMModel(model).model,
        temperature: 0.1,
        max_tokens: 500,
        messages: concatMessages,
        stream: false
    });

    return data.choices?.[0]?.message?.content || '';
}
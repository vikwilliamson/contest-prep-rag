import { RunnableLambda } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { BaseRetriever } from "@langchain/core/retrievers";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatAnthropic } from "@langchain/anthropic";
import { getVectorStore } from "./vectorStore";

export const TOP_K = 4;

export const FALLBACK_RESPONSE =
  "There is no info regarding that topic. Please consult with your coach.";

export const RAG_SYSTEM_PROMPT = `You are a knowledgeable contest prep assistant for NPC/IFBB competitors. Use the following context from the athlete's prep documents to answer their question accurately and concisely.

Context:
{context}

Previous conversation:
{chat_history}`;

const ragPrompt = ChatPromptTemplate.fromMessages([
  ["system", RAG_SYSTEM_PROMPT],
  ["human", "{question}"],
]);

const outputParser = new StringOutputParser();

// Accepts either a model instance or a factory — factory defers instantiation
// until the chain is first invoked, avoiding constructor issues in test environments.
type LlmInput = BaseChatModel | (() => BaseChatModel);

export function buildRagChain(retriever: BaseRetriever, llm: LlmInput) {
  let resolvedLlm: BaseChatModel | null =
    typeof llm !== "function" ? llm : null;

  function getLlm(): BaseChatModel {
    if (!resolvedLlm) {
      resolvedLlm = (llm as () => BaseChatModel)();
    }
    return resolvedLlm;
  }

  return RunnableLambda.from(
    async ({
      question,
      chat_history,
    }: {
      question: string;
      chat_history: string;
    }): Promise<string> => {
      const docs = await retriever.invoke(question);
      if (docs.length === 0) return FALLBACK_RESPONSE;

      const context = docs.map((d) => d.pageContent).join("\n\n");
      const messages = await ragPrompt.formatMessages({
        context,
        chat_history,
        question,
      });
      const aiMsg = await getLlm().invoke(messages);
      return outputParser.invoke(aiMsg);
    }
  );
}

let chainPromise: Promise<ReturnType<typeof buildRagChain>> | null = null;

export async function getRagChain() {
  if (!chainPromise) {
    chainPromise = (async () => {
      const store = await getVectorStore();
      const retriever = store.asRetriever(TOP_K);
      return buildRagChain(
        retriever,
        () =>
          new ChatAnthropic({
            model: "claude-sonnet-4-5",
            apiKey: process.env.ANTHROPIC_API_KEY,
          })
      );
    })();
  }
  return chainPromise;
}

export function resetRagChain(): void {
  chainPromise = null;
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FakeListChatModel,
  FakeRetriever,
} from '@langchain/core/utils/testing'
import { Document } from '@langchain/core/documents'
import { ChatPromptTemplate } from '@langchain/core/prompts'

describe('Task 5: RAG Chain Construction', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  // ── Constants ──────────────────────────────────────────────────────────────

  it('should set TOP_K to 4', async () => {
    const { TOP_K } = await import('../lib/ragChain')
    expect(TOP_K).toBe(4)
  })

  it('should define the exact fallback response string', async () => {
    const { FALLBACK_RESPONSE } = await import('../lib/ragChain')
    expect(FALLBACK_RESPONSE).toBe(
      'There is no info regarding that topic. Please consult with your coach.'
    )
  })

  // ── Prompt template ────────────────────────────────────────────────────────

  it('should contain {context} and {chat_history} placeholders in the system prompt', async () => {
    const { RAG_SYSTEM_PROMPT } = await import('../lib/ragChain')
    expect(RAG_SYSTEM_PROMPT).toContain('{context}')
    expect(RAG_SYSTEM_PROMPT).toContain('{chat_history}')
  })

  it('should correctly substitute all placeholders in the formatted prompt', async () => {
    const { RAG_SYSTEM_PROMPT } = await import('../lib/ragChain')

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', RAG_SYSTEM_PROMPT],
      ['human', '{question}'],
    ])

    const messages = await prompt.formatMessages({
      context: 'Carbs: 200g on training days.',
      chat_history: 'User: What is my calorie target? Assistant: 2400 calories.',
      question: 'What about carbs?',
    })

    const systemContent = messages[0].content as string
    expect(systemContent).toContain('Carbs: 200g on training days.')
    expect(systemContent).toContain('User: What is my calorie target? Assistant: 2400 calories.')

    const humanContent = messages[1].content as string
    expect(humanContent).toContain('What about carbs?')
  })

  // ── Chain behaviour: context present ──────────────────────────────────────

  it('should return the LLM response when documents are retrieved', async () => {
    const { buildRagChain } = await import('../lib/ragChain')

    const docs = [
      new Document({ pageContent: 'Carbs: 200g on training days.', metadata: { source: 'nutrition.pdf' } }),
      new Document({ pageContent: 'Protein: 220g daily throughout prep.', metadata: { source: 'nutrition.pdf' } }),
    ]
    const retriever = new FakeRetriever({ output: docs })
    const llm = new FakeListChatModel({ responses: ['Eat 200g of carbs on training days.'] })

    const chain = buildRagChain(retriever, llm)
    const result = await chain.invoke({ question: 'How many carbs?', chat_history: '' })

    expect(typeof result).toBe('string')
    expect(result).toBe('Eat 200g of carbs on training days.')
  })

  it('should join multiple retrieved documents into a single context block', async () => {
    const { buildRagChain } = await import('../lib/ragChain')

    const docs = [
      new Document({ pageContent: 'Morning: fasted cardio 45 min.', metadata: {} }),
      new Document({ pageContent: 'Evening: resistance training 60 min.', metadata: {} }),
    ]
    const retriever = new FakeRetriever({ output: docs })

    // Capture what gets sent to the LLM by recording the messages it receives
    const receivedMessages: string[] = []
    const llm = new FakeListChatModel({ responses: ['Combined training info.'] })
    const originalInvoke = llm.invoke.bind(llm)
    llm.invoke = async (input: unknown, ...args: unknown[]) => {
      if (Array.isArray(input)) {
        receivedMessages.push(...input.map((m: { content: string }) => m.content))
      }
      return originalInvoke(input as Parameters<typeof originalInvoke>[0])
    }

    const chain = buildRagChain(retriever, llm)
    await chain.invoke({ question: 'What is my training?', chat_history: '' })

    const systemMsg = receivedMessages.find((m) => m.includes('Morning:'))
    expect(systemMsg).toBeDefined()
    expect(systemMsg).toContain('Evening:')
  })

  // ── Chain behaviour: fallback ──────────────────────────────────────────────

  it('should return the exact fallback string when no documents are retrieved', async () => {
    const { buildRagChain, FALLBACK_RESPONSE } = await import('../lib/ragChain')

    const retriever = new FakeRetriever({ output: [] })
    const llm = new FakeListChatModel({ responses: ['This should never appear.'] })

    const chain = buildRagChain(retriever, llm)
    const result = await chain.invoke({ question: 'What is my supplement stack?', chat_history: '' })

    expect(result).toBe(FALLBACK_RESPONSE)
  })

  it('should not invoke the LLM when no documents are retrieved', async () => {
    const { buildRagChain } = await import('../lib/ragChain')

    const retriever = new FakeRetriever({ output: [] })
    const llm = new FakeListChatModel({ responses: [] })
    const invokeSpy = vi.spyOn(llm, 'invoke')

    const chain = buildRagChain(retriever, llm)
    await chain.invoke({ question: 'Any topic with no context', chat_history: '' })

    expect(invokeSpy).not.toHaveBeenCalled()
  })

  // ── Streaming ──────────────────────────────────────────────────────────────

  it('should support streaming via the Runnable interface', async () => {
    const { buildRagChain } = await import('../lib/ragChain')

    const docs = [new Document({ pageContent: 'Training: 5 days per week.', metadata: {} })]
    const retriever = new FakeRetriever({ output: docs })
    const llm = new FakeListChatModel({ responses: ['Five days of training per week.'] })

    const chain = buildRagChain(retriever, llm)
    expect(typeof chain.stream).toBe('function')

    const chunks: string[] = []
    for await (const chunk of await chain.stream({ question: 'Training frequency?', chat_history: '' })) {
      if (typeof chunk === 'string') chunks.push(chunk)
    }

    expect(chunks.join('')).toBeTruthy()
  })

  // ── getRagChain integration ────────────────────────────────────────────────

  it('should wire the retriever with TOP_K via getRagChain', async () => {
    const mockAsRetriever = vi.fn().mockReturnValue(new FakeRetriever({ output: [] }))
    vi.doMock('../lib/vectorStore', () => ({
      getVectorStore: vi.fn().mockResolvedValue({ asRetriever: mockAsRetriever }),
    }))
    vi.doMock('@langchain/anthropic', () => ({
      ChatAnthropic: vi.fn().mockImplementation(
        () => new FakeListChatModel({ responses: [] })
      ),
    }))

    const { getRagChain, TOP_K } = await import('../lib/ragChain')
    await getRagChain()

    expect(mockAsRetriever).toHaveBeenCalledWith(TOP_K)
  })
})

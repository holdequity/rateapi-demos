/**
 * LangChain Mortgage Agent
 *
 * Creates an AI agent that can search mortgage rates, calculate payments,
 * and help users understand their financing options.
 */

import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

import {
  searchRates,
  calculatePayment,
  compareRates,
  getCreditUnion,
} from './tools/index.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load system prompt
const systemPrompt = readFileSync(
  join(__dirname, 'prompts', 'system.txt'),
  'utf-8'
);

/**
 * Create a mortgage advisor agent
 */
export function createMortgageAgent(options = {}) {
  const {
    model = 'gpt-4o',
    temperature = 0.3,
    verbose = false,
  } = options;

  // Check for required API keys
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!process.env.RATEAPI_KEY) {
    console.warn('Warning: RATEAPI_KEY not set. Rate searches will fail.');
  }

  // Initialize the LLM
  const llm = new ChatOpenAI({
    model,
    temperature,
  });

  // Define the tools available to the agent
  const tools = [
    searchRates,
    calculatePayment,
    compareRates,
    getCreditUnion,
  ];

  // Create the agent using LangGraph's prebuilt React agent
  const agent = createReactAgent({
    llm,
    tools,
  });

  return {
    /**
     * Send a message to the agent and get a response
     * @param {string} message - User's message
     * @param {Array} history - Previous conversation messages
     * @returns {Promise<{response: string, toolCalls: Array}>}
     */
    async chat(message, history = []) {
      // Build messages array with system prompt, history, and new message
      const messages = [
        new SystemMessage(systemPrompt),
        ...history,
        new HumanMessage(message),
      ];

      // Stream the response
      const result = await agent.invoke({
        messages,
      });

      // Extract the final response
      const lastMessage = result.messages[result.messages.length - 1];

      // Collect tool calls for debugging/logging
      const toolCalls = result.messages
        .filter(m => m.additional_kwargs?.tool_calls)
        .flatMap(m => m.additional_kwargs.tool_calls || []);

      return {
        response: lastMessage.content,
        toolCalls,
        messages: result.messages,
      };
    },

    /**
     * Stream responses from the agent
     * @param {string} message - User's message
     * @param {Array} history - Previous conversation messages
     * @yields {string} - Response chunks
     */
    async *stream(message, history = []) {
      const messages = [
        new SystemMessage(systemPrompt),
        ...history,
        new HumanMessage(message),
      ];

      const stream = await agent.stream({
        messages,
      });

      for await (const chunk of stream) {
        // Yield content from agent responses
        if (chunk.agent?.messages) {
          for (const msg of chunk.agent.messages) {
            if (msg.content) {
              yield msg.content;
            }
          }
        }
      }
    },
  };
}

/**
 * Simple one-shot query (no conversation history)
 */
export async function askMortgageAgent(question, options = {}) {
  const agent = createMortgageAgent(options);
  const result = await agent.chat(question);
  return result.response;
}

// Export for direct usage
export default createMortgageAgent;

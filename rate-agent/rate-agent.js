#!/usr/bin/env node

/**
 * RateAPI AI Agent Demo
 *
 * Chat-based mortgage advisor that uses RateAPI to answer questions
 * about mortgage rates. Runs in mock mode by default (no LLM key needed).
 *
 * Usage:
 *   node rate-agent.js           # Mock mode (default)
 *   node rate-agent.js --real    # Real mode (requires OPENAI_API_KEY)
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { RateAPIClient, TOOLS, executeTool } from './tools.js';
import { MockLLM } from './mock-llm.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEMOS_DIR = path.resolve(__dirname, '..');
const SHARED_ENV_PATH = path.join(DEMOS_DIR, '.env');

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function print(text, color = '') {
  console.log(color ? `${color}${text}${colors.reset}` : text);
}

function printBold(text) { print(text, colors.bold); }
function printSuccess(text) { print(text, colors.green); }
function printWarning(text) { print(text, colors.yellow); }
function printError(text) { print(text, colors.red); }
function printDim(text) { print(text, colors.dim); }

// Load environment from file
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch {
    return {};
  }
}

// Get config from env files
function getConfig() {
  const sharedEnv = loadEnvFile(SHARED_ENV_PATH);
  const localEnv = loadEnvFile(path.join(__dirname, '.env'));

  const config = { ...sharedEnv, ...localEnv };

  // Environment variables take precedence
  for (const key of ['RATEAPI_KEY', 'RATEAPI_URL', 'OPENAI_API_KEY']) {
    if (process.env[key]) {
      config[key] = process.env[key];
    }
  }

  return config;
}

/**
 * Mock LLM Agent - uses pattern matching to parse questions
 */
class MockAgent {
  constructor(rateClient) {
    this.rateClient = rateClient;
    this.mockLLM = new MockLLM();
  }

  async chat(userMessage) {
    const { toolName, toolArgs, thinking } = this.mockLLM.parseMessage(userMessage);

    if (!toolName) {
      return this.mockLLM.generateFallbackResponse(userMessage);
    }

    if (thinking) {
      printDim(`\n${thinking}`);
    }
    print(`[Calling RateAPI: ${toolName}]`, colors.cyan);
    for (const [key, value] of Object.entries(toolArgs)) {
      printDim(`  ${key}: ${value}`);
    }

    try {
      const result = await executeTool(this.rateClient, toolName, toolArgs);
      return this.mockLLM.formatResponse(toolName, result, userMessage);
    } catch (error) {
      return `Sorry, I encountered an error: ${error.message}`;
    }
  }
}

/**
 * Real LLM Agent - uses OpenAI for natural language understanding
 */
class RealAgent {
  constructor(openaiKey, rateClient) {
    this.rateClient = rateClient;
    this.messages = [
      {
        role: 'system',
        content: `You are a helpful mortgage rate advisor. You help users find the best mortgage rates
by using the RateAPI tools available to you.

When users ask about mortgage rates:
1. Use get_financing_decision to find personalized recommendations
2. Use get_credit_union to get details about specific lenders

Always be helpful and explain the results in plain language. If the user doesn't
specify a state or amount, ask them for this information.

Format monetary values with commas and dollar signs. Format percentages with one decimal place.`,
      },
    ];

    // Dynamically import OpenAI
    this.openaiPromise = import('openai').then(({ default: OpenAI }) => {
      this.openai = new OpenAI({ apiKey: openaiKey });
    });
  }

  async chat(userMessage) {
    await this.openaiPromise;

    this.messages.push({ role: 'user', content: userMessage });

    let response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: this.messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;
    this.messages.push(assistantMessage);

    // Handle tool calls
    while (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        print(`\n[Calling RateAPI: ${name}]`, colors.cyan);
        for (const [key, value] of Object.entries(args)) {
          printDim(`  ${key}: ${value}`);
        }

        let toolResponse;
        try {
          const result = await executeTool(this.rateClient, name, args);
          toolResponse = JSON.stringify(result);
        } catch (error) {
          toolResponse = JSON.stringify({ error: error.message });
        }

        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });
      }

      // Get next response
      response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: this.messages,
        tools: TOOLS,
        tool_choice: 'auto',
      });

      assistantMessage = response.choices[0].message;
      this.messages.push(assistantMessage);
    }

    return assistantMessage.content || '';
  }
}

// Create readline interface
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Main
async function main() {
  const useReal = process.argv.includes('--real');

  console.clear();
  printBold('RateAPI AI Mortgage Advisor');
  print('=' .repeat(28) + '\n');

  const config = getConfig();
  const apiKey = config.RATEAPI_KEY;
  const apiUrl = config.RATEAPI_URL || 'https://api.rateapi.dev';

  if (!apiKey) {
    printError('No RATEAPI_KEY found!');
    print('\nRun the rate-explorer demo first to create a key:');
    print('  cd ../rate-explorer && node rate-explorer.js');
    print('\nOr set RATEAPI_KEY in ../demos/.env');
    process.exit(1);
  }

  printDim(`Using API: ${apiUrl}`);
  printDim(`Using key: ${apiKey.substring(0, 10)}...`);

  // Create RateAPI client
  const rateClient = new RateAPIClient(apiKey, apiUrl);

  // Create agent
  let agent;
  if (useReal) {
    const openaiKey = config.OPENAI_API_KEY;
    if (!openaiKey) {
      printWarning('\nNo OPENAI_API_KEY found. Running in mock mode instead.');
      printDim('To use real mode, set OPENAI_API_KEY in your environment.\n');
      agent = new MockAgent(rateClient);
      print('Mode: Mock (simulated AI)', colors.yellow);
    } else {
      print('Mode: Real (OpenAI GPT-4)', colors.green);
      agent = new RealAgent(openaiKey, rateClient);
    }
  } else {
    print('Mode: Mock (simulated AI)', colors.yellow);
    printDim('Use --real flag with OPENAI_API_KEY for real AI responses.\n');
    agent = new MockAgent(rateClient);
  }

  console.log('');
  print('Ask me about mortgage rates! Examples:');
  print('  - What are the best rates in California?', colors.cyan);
  print('  - Show me rates for a $500k home in North Carolina', colors.cyan);
  print('  - Tell me about Navy Federal Credit Union', colors.cyan);
  console.log('');
  printDim("Type 'quit' or 'exit' to leave.\n");

  const rl = createPrompt();

  const askQuestion = () => {
    rl.question(`${colors.green}You: ${colors.reset}`, async (input) => {
      const userInput = input.trim();

      if (!userInput) {
        askQuestion();
        return;
      }

      if (['quit', 'exit', 'q'].includes(userInput.toLowerCase())) {
        console.log('');
        printSuccess('Thanks for using RateAPI AI Advisor!');
        print('Learn more at https://rateapi.dev');
        rl.close();
        return;
      }

      console.log('');
      try {
        const response = await agent.chat(userInput);
        console.log('');
        print(`Agent: ${response}`, colors.blue);
      } catch (error) {
        printError(`Error: ${error.message}`);
      }
      console.log('');

      askQuestion();
    });
  };

  askQuestion();
}

// Run
main().catch((error) => {
  printError(`Fatal error: ${error.message}`);
  process.exit(1);
});

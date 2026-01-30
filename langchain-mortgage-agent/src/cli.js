#!/usr/bin/env node
/**
 * Interactive CLI for the Mortgage Agent
 *
 * Usage: npm run chat
 */

import readline from 'readline';
import { createMortgageAgent } from './agent.js';
import chalk from 'chalk';
import ora from 'ora';
import 'dotenv/config';

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error(chalk.red('Error: OPENAI_API_KEY environment variable is required'));
  console.log(chalk.yellow('Set it in your .env file or environment'));
  process.exit(1);
}

if (!process.env.RATEAPI_KEY) {
  console.warn(chalk.yellow('Warning: RATEAPI_KEY not set. Rate searches will fail.'));
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Store conversation history for context
const conversationHistory = [];

// Create the agent
const agent = createMortgageAgent({
  model: 'gpt-4o',
  temperature: 0.3,
});

// Welcome message
console.log('');
console.log(chalk.bold.blue('🏦 Mortgage Advisor Agent'));
console.log(chalk.gray('Powered by LangChain + RateAPI'));
console.log('');
console.log(chalk.gray('Ask me about mortgage rates, payments, or comparisons.'));
console.log(chalk.gray('Type "exit" or "quit" to end the conversation.'));
console.log('');

// Example prompts
console.log(chalk.dim('Try asking:'));
console.log(chalk.dim('  • "What are the best rates in California?"'));
console.log(chalk.dim('  • "Calculate payment on $400k at 6.5%"'));
console.log(chalk.dim('  • "Compare rates in CA vs TX vs NY"'));
console.log('');

/**
 * Main chat loop
 */
async function chat() {
  rl.question(chalk.green('You: '), async (input) => {
    const trimmedInput = input.trim();

    // Handle exit commands
    if (['exit', 'quit', 'bye', 'q'].includes(trimmedInput.toLowerCase())) {
      console.log(chalk.blue('\nGoodbye! Happy house hunting! 🏠\n'));
      rl.close();
      process.exit(0);
    }

    // Handle empty input
    if (!trimmedInput) {
      chat();
      return;
    }

    // Handle help command
    if (trimmedInput.toLowerCase() === 'help') {
      console.log('');
      console.log(chalk.bold('Available commands:'));
      console.log('  help     - Show this help message');
      console.log('  clear    - Clear conversation history');
      console.log('  exit     - Exit the chat');
      console.log('');
      console.log(chalk.bold('Example questions:'));
      console.log('  • What are the best mortgage rates in [state]?');
      console.log('  • Calculate monthly payment for $X at Y% over Z years');
      console.log('  • Compare rates between [state1] and [state2]');
      console.log('  • What\'s the difference between rate and APR?');
      console.log('  • Tell me about [credit union name]');
      console.log('');
      chat();
      return;
    }

    // Handle clear command
    if (trimmedInput.toLowerCase() === 'clear') {
      conversationHistory.length = 0;
      console.log(chalk.gray('Conversation history cleared.\n'));
      chat();
      return;
    }

    // Show thinking spinner
    const spinner = ora({
      text: 'Thinking...',
      color: 'blue',
    }).start();

    try {
      // Get response from agent
      const result = await agent.chat(trimmedInput, conversationHistory);

      spinner.stop();

      // Display the response
      console.log('');
      console.log(chalk.blue('Agent: ') + result.response);
      console.log('');

      // Show tool calls if any (for debugging)
      if (result.toolCalls?.length > 0 && process.env.DEBUG) {
        console.log(chalk.dim(`[Used ${result.toolCalls.length} tool(s): ${result.toolCalls.map(t => t.function?.name).join(', ')}]`));
        console.log('');
      }

      // Update conversation history (keep last 10 exchanges to manage context length)
      // Store the messages from the result for context continuity
      if (result.messages) {
        // Add user message and assistant response to history
        conversationHistory.push(...result.messages.slice(1)); // Skip system message
      }

      // Trim history if too long
      if (conversationHistory.length > 20) {
        conversationHistory.splice(0, 4); // Remove oldest exchange
      }
    } catch (error) {
      spinner.stop();
      console.log('');
      console.log(chalk.red('Error: ') + error.message);

      if (error.message.includes('API key')) {
        console.log(chalk.yellow('Make sure your OPENAI_API_KEY and RATEAPI_KEY are set correctly.'));
      }

      console.log('');
    }

    // Continue the chat loop
    chat();
  });
}

// Handle Ctrl+C gracefully
rl.on('close', () => {
  console.log(chalk.blue('\nGoodbye! 👋\n'));
  process.exit(0);
});

// Start the chat
chat();

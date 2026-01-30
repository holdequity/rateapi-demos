/**
 * Express web server for the Mortgage Agent
 *
 * Provides a simple chat API endpoint and web interface.
 *
 * Usage: npm run web
 */

import express from 'express';
import { createMortgageAgent } from './agent.js';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store sessions (in production, use Redis or similar)
const sessions = new Map();

// Create agent instance
const agent = createMortgageAgent({
  model: 'gpt-4o',
  temperature: 0.3,
});

/**
 * Chat endpoint
 * POST /api/chat
 * Body: { message: string, sessionId?: string }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    // Get response from agent
    const result = await agent.chat(message, history);

    // Update history (keep last 20 messages)
    if (history.length > 20) {
      history.splice(0, 4);
    }

    res.json({
      response: result.response,
      toolsUsed: result.toolCalls?.map(t => t.function?.name) || [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clear session endpoint
 * POST /api/clear
 * Body: { sessionId?: string }
 */
app.post('/api/clear', (req, res) => {
  const { sessionId = 'default' } = req.body;
  sessions.delete(sessionId);
  res.json({ success: true });
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasRateAPIKey: !!process.env.RATEAPI_KEY,
  });
});

// Serve a simple HTML interface
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mortgage Advisor Agent</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #1a1a2e;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.7; font-size: 14px; }
    .chat-container {
      flex: 1;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px 0;
    }
    .message {
      margin-bottom: 16px;
      display: flex;
      gap: 12px;
    }
    .message.user { justify-content: flex-end; }
    .message-content {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      line-height: 1.5;
    }
    .message.user .message-content {
      background: #1a1a2e;
      color: white;
    }
    .message.agent .message-content {
      background: white;
      border: 1px solid #e0e0e0;
    }
    .message-content pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }
    .message-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
      font-size: 14px;
    }
    .message-content th {
      background: #f8f9fa;
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }
    .message-content td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
    }
    .message-content tr:nth-child(even) {
      background: #f9f9f9;
    }
    .message-content code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    .message-content ul, .message-content ol {
      margin: 8px 0;
      padding-left: 20px;
    }
    .message-content li {
      margin: 4px 0;
    }
    .message-content p {
      margin: 8px 0;
    }
    .message-content h1, .message-content h2, .message-content h3 {
      margin: 12px 0 8px 0;
    }
    .input-area {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    #message-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      outline: none;
    }
    #message-input:focus { border-color: #1a1a2e; }
    button {
      padding: 12px 24px;
      background: #1a1a2e;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading {
      display: flex;
      gap: 4px;
      padding: 8px;
    }
    .loading span {
      width: 8px;
      height: 8px;
      background: #1a1a2e;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .loading span:nth-child(1) { animation-delay: -0.32s; }
    .loading span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .examples {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .example-btn {
      padding: 8px 16px;
      background: #e8e8e8;
      color: #333;
      border: none;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
    }
    .example-btn:hover { background: #d0d0d0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏦 Mortgage Advisor Agent</h1>
    <p>Powered by LangChain + RateAPI</p>
  </div>

  <div class="chat-container">
    <div class="examples">
      <button class="example-btn" onclick="askExample('What are the best mortgage rates in California?')">Best rates in CA</button>
      <button class="example-btn" onclick="askExample('Calculate payment on $400k at 6.5%')">Calculate payment</button>
      <button class="example-btn" onclick="askExample('Compare rates in CA vs TX vs NY')">Compare states</button>
      <button class="example-btn" onclick="askExample('What is the difference between rate and APR?')">Rate vs APR</button>
    </div>

    <div class="messages" id="messages">
      <div class="message agent">
        <div class="message-content">
          👋 Hi! I'm your AI mortgage advisor. I can help you:
          <ul style="margin-top: 8px; padding-left: 20px;">
            <li>Search current mortgage rates from 4,000+ credit unions</li>
            <li>Calculate monthly payments and total costs</li>
            <li>Compare rates across different states</li>
            <li>Explain mortgage concepts</li>
          </ul>
          <p style="margin-top: 8px;">What would you like to know?</p>
        </div>
      </div>
    </div>

    <div class="input-area">
      <input
        type="text"
        id="message-input"
        placeholder="Ask about mortgage rates..."
        onkeypress="if(event.key==='Enter') sendMessage()"
      >
      <button onclick="sendMessage()" id="send-btn">Send</button>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    const messagesDiv = document.getElementById('messages');
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    // Configure marked for safe rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    function addMessage(content, isUser) {
      const div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user' : 'agent');
      div.innerHTML = '<div class="message-content">' + formatContent(content) + '</div>';
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function formatContent(content) {
      // Use marked for full markdown support including tables
      return marked.parse(content);
    }

    function showLoading() {
      const div = document.createElement('div');
      div.className = 'message agent';
      div.id = 'loading';
      div.innerHTML = '<div class="loading"><span></span><span></span><span></span></div>';
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function hideLoading() {
      const loading = document.getElementById('loading');
      if (loading) loading.remove();
    }

    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;

      addMessage(message, true);
      input.value = '';
      sendBtn.disabled = true;
      showLoading();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();
        hideLoading();

        if (data.error) {
          addMessage('Sorry, something went wrong: ' + data.error, false);
        } else {
          addMessage(data.response, false);
        }
      } catch (error) {
        hideLoading();
        addMessage('Sorry, I encountered an error. Please try again.', false);
      }

      sendBtn.disabled = false;
      input.focus();
    }

    function askExample(question) {
      input.value = question;
      sendMessage();
    }

    input.focus();
  </script>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🏦 Mortgage Advisor Agent');
  console.log('========================');
  console.log('');
  console.log(`Web interface: http://localhost:${PORT}`);
  console.log(`API endpoint:  http://localhost:${PORT}/api/chat`);
  console.log('');
  console.log('Environment:');
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  RATEAPI_KEY:    ${process.env.RATEAPI_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log('');
});

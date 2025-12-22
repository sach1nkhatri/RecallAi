import React, { useState, useRef, useEffect } from 'react';
import '../css/BotPreviewCard.css';

const BotPreviewCard = ({ bot, onError }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: bot?.description 
        ? `Hello! I'm ${bot.name}. ${bot.description} How can I help you today?`
        : `Hello! I'm ${bot?.name || 'your assistant'}. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getApiBase = () => {
    if (typeof window === 'undefined') return 'http://localhost:5001';
    const envApi = process.env.REACT_APP_API_BASE_URL;
    if (envApi) return envApi;
    return window.location.port === '3000' || !window.location.port
      ? 'http://localhost:5001'
      : window.location.origin;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !bot?.id) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiBase()}/api/bots/${bot.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          system_prompt: bot.systemPrompt,
          temperature: bot.temperature || 0.7,
          top_k: bot.topK || 5,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Chat failed' }));
        throw new Error(error.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantMessage += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      onError(error.message || 'Failed to get response from bot');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!bot) {
    return null;
  }

  return (
    <div className="bot-preview-card">
      <div className="bot-preview-header">
        <div className="bot-preview-header-main">
          <div className="bot-preview-header-icon">💬</div>
          <div>
            <h3>Step 3: Test Your Bot</h3>
            <p className="bot-preview-header-subtitle">Ask questions and see how your bot responds!</p>
          </div>
        </div>
        <div className="bot-preview-bot-info">
          <span className="bot-preview-bot-name">{bot.name}</span>
        </div>
      </div>

      <div className="bot-preview-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`bot-preview-message bot-preview-message-${msg.role}`}
          >
            <div className="bot-preview-message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="bot-preview-message bot-preview-message-assistant">
            <div className="bot-preview-message-content">
              <span className="bot-preview-typing">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="bot-preview-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="bot-preview-input"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bot-preview-send-btn"
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default BotPreviewCard;


import React, { useState, useRef, useEffect } from 'react';
import { getNodeApiBase, getAuthToken } from '../../../core/utils/nodeApi';
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
  const messagesContainerRef = useRef(null);

  const getApiBase = getNodeApiBase;

  // Clean redacted_reasoning and think tags from content
  const cleanRedactedReasoning = (content) => {
    if (!content || typeof content !== 'string') return content;
    // Remove <think>...</think> tags and their content
    let cleaned = content.replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, '').trim();
    // Remove <think>...</think> tags and their content
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Remove thinking patterns at the start of lines
    cleaned = cleaned.replace(/^(okay,?\s+i\s+need\s+to|let\s+me|first,?\s+|looking\s+at|wait,?\s+|i\s+see\s+that|the\s+user|based\s+on\s+the|i\s+should|i\s+will|i\s+think|i\s+believe|i\s+understand).*?\n/gim, '');
    // Remove content before first actual content
    const lines = cleaned.split('\n');
    const cleanedLines = [];
    let foundContent = false;
    for (const line of lines) {
      const stripped = line.trim();
      if (!stripped) {
        if (foundContent) cleanedLines.push(line);
        continue;
      }
      // Check if this is actual content
      const isContent = (
        stripped.startsWith('#') ||
        stripped.startsWith('```') ||
        stripped.startsWith('|') ||
        (stripped[0] === stripped[0].toUpperCase() && stripped.length > 10) ||
        (stripped[0] >= '0' && stripped[0] <= '9' && stripped.includes('.')) ||
        foundContent
      );
      if (isContent || !/^(okay|let me|first|looking|wait|i see|i think|i believe)/i.test(stripped.substring(0, 30))) {
        foundContent = true;
        cleanedLines.push(line);
      }
    }
    cleaned = cleanedLines.join('\n');
    return cleaned.trim();
  };

  // Normalize spaces in text (add spaces where missing) - smart normalization
  const normalizeSpaces = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // First, check if text already has proper spacing
    const wordsWithSpaces = (text.match(/\b\w+\s+/g) || []).length;
    const totalWords = (text.match(/\b\w+\b/g) || []).length;
    if (totalWords > 0 && wordsWithSpaces / totalWords > 0.7) {
      // Text already has good spacing, only fix obvious issues
      // Pattern 1: camelCase
      text = text.replace(/([a-z])([A-Z][a-z])/g, '$1 $2');
      // Pattern 2: punctuation without space after
      text = text.replace(/([!?.,;:])([A-Za-z])/g, '$1 $2');
      // Clean up multiple spaces
      text = text.replace(/ +/g, ' ');
      return text.trim();
    }
    
    // Text has missing spaces - apply normalization
    // Pattern 1: lowercase letter followed by uppercase letter (word boundary)
    // e.g., "helloWorld" -> "hello World"
    text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Pattern 2: letter followed by punctuation then letter (if no space)
    // e.g., "hello!Yes" -> "hello! Yes"
    text = text.replace(/([a-zA-Z])([!?.])([A-Za-z])/g, '$1$2 $3');
    
    // Pattern 3: punctuation followed by letter (if no space)
    // e.g., "Yes,I'm" -> "Yes, I'm"
    text = text.replace(/([!?.,;:])([A-Za-z])/g, '$1 $2');
    
    // Pattern 4: apostrophe in contractions - ONLY if followed by 2+ letters
    // e.g., "I'mready" -> "I'm ready" (but NOT "I'm" -> "I' m")
    text = text.replace(/(\w)'([a-zA-Z]{2,})/g, "$1' $2");
    
    // Pattern 5: number followed by letter or vice versa
    // e.g., "2024sales" -> "2024 sales"
    text = text.replace(/([0-9])([A-Za-z])/g, '$1 $2');
    text = text.replace(/([A-Za-z])([0-9])/g, '$1 $2');
    
    // Pattern 6: Common word boundaries - use word boundaries to avoid matching inside words
    const commonWords = ['are', 'is', 'am', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'as'];
    for (const word of commonWords) {
      // Word followed by letter - use word boundary
      text = text.replace(new RegExp(`\\b(${word})([A-Za-z])`, 'gi'), '$1 $2');
    }
    
    // Special case for "I" - only if followed by capital letter (not apostrophe)
    text = text.replace(/\bI([A-Z][a-z])/g, 'I $1');
    
    // Pattern 7: Fix camelCase
    text = text.replace(/([a-z])([A-Z][a-z])/g, '$1 $2');
    
    // Clean up multiple spaces
    text = text.replace(/ +/g, ' ');
    
    return text.trim();
  };

  const scrollToBottom = () => {
    // Scroll only the messages container, not the whole page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when bot changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!bot?.id) return;
      
      try {
        const token = getAuthToken();
        const response = await fetch(`${getApiBase()}/api/bots/${bot.id}/chat/history`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            // Load history messages
            const historyMessages = data.messages.map(msg => ({
              role: msg.role,
              content: normalizeSpaces(cleanRedactedReasoning(msg.content)),
            }));
            
            // Only set if we have actual history (more than just greeting)
            if (historyMessages.length > 0) {
              setMessages(historyMessages);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Don't show error to user - just start with default greeting
      }
    };
    
    loadChatHistory();
  }, [bot?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !bot?.id) return;
    
    // Check if bot is ready (not training or error)
    if (bot.status === 'training') {
      onError('Bot is still training. Please wait for training to complete.');
      return;
    }
    if (bot.status === 'error') {
      onError('Bot has an error. Please check the bot configuration and try uploading documents again.');
      return;
    }

    // Check chat limit
    try {
      const token = getAuthToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const usageResponse = await fetch(`${getApiBase()}/api/users/usage`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json().catch(() => ({ success: false }));
        if (usageData.success && usageData.usage) {
          const usage = usageData.usage;
          if (usage.chats.today >= usage.chats.limit) {
            onError(`Daily chat limit reached. Free plan allows ${usage.chats.limit} chats per day. Upgrade for more.`);
            return;
          }
        }
      }
    } catch (err) {
      // Don't block chat if usage check fails - might be temporary network issue
      if (err.name !== 'AbortError') {
        console.error('Failed to check usage:', err);
      }
    }

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const token = getAuthToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for chat
      
      const response = await fetch(`${getApiBase()}/api/bots/${bot.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          message: userMessage,
          system_prompt: bot.systemPrompt,
          temperature: bot.temperature || 0.7,
          top_k: bot.topK || 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Chat failed' }));
        throw new Error(error.error || `Chat failed with status ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let streamError = null;

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') {
                  break;
                }
                const data = JSON.parse(jsonStr);
                if (data.content) {
                  assistantMessage += data.content;
                  // Clean redacted_reasoning tags from the message
                  let cleanedMessage = cleanRedactedReasoning(assistantMessage);
                  // Normalize spaces to fix missing spaces from tokenizer
                  cleanedMessage = normalizeSpaces(cleanedMessage);
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: cleanedMessage,
                    };
                    return newMessages;
                  });
                }
                if (data.error) {
                  streamError = data.error;
                  break;
                }
              } catch (e) {
                // Skip invalid JSON - might be partial chunk
                console.debug('Skipping invalid JSON in stream:', e);
              }
            }
          }
        }
      } catch (streamErr) {
        console.error('Stream reading error:', streamErr);
        if (assistantMessage.length === 0) {
          throw new Error('Failed to read response stream');
        }
        // If we have partial content, keep it
      } finally {
        reader.releaseLock();
      }

      if (streamError) {
        throw new Error(streamError);
      }

      // Increment chat usage after successful response (non-blocking)
      try {
        const token = getAuthToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        await fetch(`${getApiBase()}/api/users/usage/increment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ type: 'chats', amount: 1 }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (err) {
        // Don't show error to user - usage increment is non-critical
        console.warn('Failed to increment usage (non-critical):', err.message);
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
          <div className="bot-preview-header-icon"></div>
          <div>
            <h3>Step 3: Test Your Bot</h3>
            <p className="bot-preview-header-subtitle">Ask questions and see how your bot responds!</p>
          </div>
        </div>
        <div className="bot-preview-bot-info">
          <span className="bot-preview-bot-name">{bot.name}</span>
          {bot.status && (
            <span className={`bot-preview-status bot-preview-status-${bot.status}`}>
              {bot.status === 'training' && `Training... ${bot.trainingProgress || 0}%`}
              {bot.status === 'active' && '✓ Ready'}
              {bot.status === 'error' && '⚠ Error'}
            </span>
          )}
        </div>
      </div>

      <div className="bot-preview-messages" ref={messagesContainerRef}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`bot-preview-message bot-preview-message-${msg.role}`}
          >
            <div className="bot-preview-message-content">
              {normalizeSpaces(cleanRedactedReasoning(msg.content))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="bot-preview-message bot-preview-message-assistant">
            <div className="bot-preview-thinking-bubble">
              <div className="bot-preview-typing-dots">
                <span className="bot-preview-dot"></span>
                <span className="bot-preview-dot"></span>
                <span className="bot-preview-dot"></span>
              </div>
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
          placeholder={
            bot.status === 'training' 
              ? 'Bot is training...' 
              : bot.status === 'error'
              ? 'Bot has an error'
              : 'Type your message...'
          }
          className="bot-preview-input"
          disabled={isLoading || bot.status === 'training' || bot.status === 'error'}
        />
        <button
          type="submit"
          className="bot-preview-send-btn"
          disabled={isLoading || !input.trim() || bot.status === 'training' || bot.status === 'error'}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default BotPreviewCard;


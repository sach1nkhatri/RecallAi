import React, { useState, useEffect } from 'react';
import '../css/BotConfigCard.css';

const BotConfigCard = ({ bot, onSave, isNewBot = false }) => {
  const [name, setName] = useState(bot?.name || '');
  const [description, setDescription] = useState(bot?.description || '');
  const [systemPrompt, setSystemPrompt] = useState(bot?.systemPrompt || '');
  const [temperature, setTemperature] = useState(bot?.temperature ?? 0.7);
  const [topK, setTopK] = useState(bot?.topK ?? 5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bot) {
      setName(bot.name || '');
      setDescription(bot.description || '');
      setSystemPrompt(bot.systemPrompt || '');
      setTemperature(bot.temperature ?? 0.7);
      setTopK(bot.topK ?? 5);
    }
  }, [bot]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Bot name is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim() || generateDefaultPrompt(name.trim()),
        temperature,
        topK,
      });
    } catch (error) {
      console.error('Failed to save bot:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const generateDefaultPrompt = (botName) => {
    return `You are ${botName}, a helpful AI assistant. Answer questions based on the provided context from uploaded documents. Be concise, accurate, and helpful. If the information is not in the context, say so.`;
  };

  const promptTemplates = [
    {
      name: 'Default Assistant',
      prompt: generateDefaultPrompt(name || 'Assistant'),
    },
    {
      name: 'Technical Support',
      prompt: `You are ${name || 'a technical support assistant'}. Help users troubleshoot issues using the provided documentation. Be clear, step-by-step, and reference specific sections when possible.`,
    },
    {
      name: 'Knowledge Base Q&A',
      prompt: `You are ${name || 'a knowledge base assistant'}. Answer questions using only the information from the uploaded documents. Cite sources when possible.`,
    },
    {
      name: 'Friendly Helper',
      prompt: `You are ${name || 'a friendly assistant'}. Be conversational, warm, and helpful. Use the provided context to answer questions naturally.`,
    },
  ];

  return (
    <div className="bot-config-card">
      <div className="bot-config-header">
        <div className="bot-config-header-main">
          <div className="bot-config-header-icon">✨</div>
          <div>
            <h3>{isNewBot ? 'Step 1: Create Your Bot' : 'Bot Settings'}</h3>
            <p className="bot-config-header-hint">
              {isNewBot 
                ? 'Start by giving your bot a name. Everything else is optional!'
                : 'Update your bot settings anytime'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bot-config-form">
        <div className="bot-config-field">
          <label htmlFor="bot-name">
            Bot Name <span className="bot-config-required">*</span>
            <span className="bot-config-help">What should we call your bot?</span>
          </label>
          <input
            id="bot-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Customer Support Bot, Documentation Helper"
            required
            className="bot-config-input-large"
          />
        </div>

        <div className="bot-config-field">
          <label htmlFor="bot-description">
            Description
            <span className="bot-config-help">(Optional) What will this bot help with?</span>
          </label>
          <textarea
            id="bot-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Helps customers find answers about our products"
            rows="3"
          />
        </div>

        <div className="bot-config-field bot-config-field-advanced">
          <div className="bot-config-advanced-toggle">
            <label htmlFor="bot-prompt">
              <span className="bot-config-advanced-label">Advanced: Custom Instructions</span>
              <span className="bot-config-help">(Optional) Tell your bot how to behave</span>
            </label>
            <button
              type="button"
              className="bot-config-simple-btn"
              onClick={() => setSystemPrompt('')}
            >
              Use Simple Mode
            </button>
          </div>
          <textarea
            id="bot-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={generateDefaultPrompt(name || 'Assistant')}
            rows="5"
            className="bot-config-prompt"
          />
          <div className="bot-config-templates">
            <span className="bot-config-templates-label">💡 Quick presets:</span>
            {promptTemplates.map((template, idx) => (
              <button
                key={idx}
                type="button"
                className="bot-config-template-btn"
                onClick={() => setSystemPrompt(template.prompt)}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <details className="bot-config-advanced-settings">
          <summary className="bot-config-advanced-summary">
            <span>⚙️ Advanced Settings</span>
            <span className="bot-config-advanced-hint">(Optional - defaults work great!)</span>
          </summary>
          <div className="bot-config-params">
            <div className="bot-config-param">
              <label htmlFor="bot-temperature">
                <span>Creativity Level: {temperature.toFixed(1)}</span>
                <span className="bot-config-param-label-hint">
                  {temperature < 0.4 ? 'Very Focused' : temperature < 0.7 ? 'Balanced' : 'More Creative'}
                </span>
              </label>
              <input
                id="bot-temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <div className="bot-config-param-hint">
                💡 Lower = precise answers, Higher = more creative responses
              </div>
            </div>

            <div className="bot-config-param">
              <label htmlFor="bot-topk">
                <span>Document Search: {topK} chunks</span>
                <span className="bot-config-param-label-hint">
                  {topK <= 3 ? 'Focused' : topK <= 6 ? 'Balanced' : 'Comprehensive'}
                </span>
              </label>
              <input
                id="bot-topk"
                type="range"
                min="1"
                max="10"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
              />
              <div className="bot-config-param-hint">
                💡 How many document sections to search when answering
              </div>
            </div>
          </div>
        </details>

        <button
          type="submit"
          className="bot-config-save-btn"
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? 'Saving...' : isNewBot ? 'Create Bot' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default BotConfigCard;


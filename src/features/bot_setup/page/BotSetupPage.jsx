import React, { useState, useEffect } from 'react';
import useBots from '../hooks/useBots';
import BotConfigCard from '../components/BotConfigCard';
import DocumentUploadCard from '../components/DocumentUploadCard';
import BotPreviewCard from '../components/BotPreviewCard';
import BotListCard from '../components/BotListCard';
import Toast from '../../code_to_doc/components/Toast';
import '../css/BotSetupPage.css';

const BotSetupPage = () => {
  const {
    bots,
    activeBot,
    activeBotId,
    createBot,
    updateBot,
    deleteBot,
    selectBot,
    isLoading,
    error,
  } = useBots();

  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  const handleCreateBot = async (botData) => {
    try {
      await createBot(botData);
      showToast('Bot created successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create bot', 'error');
    }
  };

  const handleUpdateBot = async (botId, botData) => {
    try {
      await updateBot(botId, botData);
      showToast('Bot updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update bot', 'error');
    }
  };

  const handleDeleteBot = async (botId) => {
    if (window.confirm('Are you sure you want to delete this bot?')) {
      try {
        await deleteBot(botId);
        showToast('Bot deleted successfully', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to delete bot', 'error');
      }
    }
  };

  const [currentStep, setCurrentStep] = useState(activeBot ? 2 : 1);

  useEffect(() => {
    if (activeBot) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  }, [activeBot]);

  const steps = [
    { number: 1, title: 'Create Your Bot', description: 'Give your bot a name and personality' },
    { number: 2, title: 'Add Documents', description: 'Upload files for your bot to learn from' },
    { number: 3, title: 'Test & Chat', description: 'Try your bot and see how it works' },
  ];

  return (
    <div className="bot-setup-page">
      <Toast message={toast.message} type={toast.type} />
      
      <header className="bot-setup-header">
        <div className="bot-setup-header-content">
          <div className="bot-setup-header-left">
            <p className="bot-setup-step-label">Dashboard / Bot Setup</p>
            <h1>Create Your Custom Chatbot</h1>
            <p className="bot-setup-tagline">
              No coding needed! Just follow 3 simple steps to create an AI chatbot that knows your documents.
            </p>
          </div>
        </div>
      </header>

      {/* Step Progress Indicator */}
      <div className="bot-setup-steps">
        <div className="bot-setup-steps-container">
          {steps.map((step, idx) => (
            <div key={step.number} className={`bot-setup-step ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
              <div className="bot-setup-step-circle">
                {currentStep > step.number ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <div className="bot-setup-step-info">
                <div className="bot-setup-step-title">{step.title}</div>
                <div className="bot-setup-step-desc">{step.description}</div>
              </div>
              {idx < steps.length - 1 && <div className="bot-setup-step-connector"></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="bot-setup-container">
        <div className="bot-setup-workspace">
          <div className="bot-setup-left">
            <BotListCard
              bots={bots}
              activeBotId={activeBotId}
              onSelect={selectBot}
              onDelete={handleDeleteBot}
              onCreateNew={() => selectBot(null)}
            />

            {activeBot ? (
              <>
                <BotConfigCard
                  bot={activeBot}
                  onSave={(botData) => handleUpdateBot(activeBot.id, botData)}
                />

                <DocumentUploadCard
                  botId={activeBot.id}
                  onUploadComplete={() => showToast('Documents uploaded and vectorized!', 'success')}
                  onError={(msg) => showToast(msg, 'error')}
                />
              </>
            ) : (
              <BotConfigCard
                bot={null}
                onSave={handleCreateBot}
                isNewBot={true}
              />
            )}
          </div>

          <div className="bot-setup-right">
            {activeBot ? (
              <BotPreviewCard
                bot={activeBot}
                onError={(msg) => showToast(msg, 'error')}
              />
            ) : (
              <div className="bot-setup-placeholder">
                <div className="bot-setup-placeholder-content">
                  <div className="bot-setup-placeholder-icon"></div>
                  <h3>Create Your First Bot</h3>
                  <p>Configure your bot settings on the left to get started.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotSetupPage;


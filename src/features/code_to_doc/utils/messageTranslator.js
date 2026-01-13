/**
 * Translates technical backend messages into user-friendly log messages
 */

const messageTranslations = {
  // Initialization messages
  'Starting generation...': '🚀 Starting documentation generation...',
  'Initializing generation...': '🚀 Initializing documentation generation...',
  
  // Repository ingestion
  'Ingesting repository files...': '📥 Analyzing repository structure...',
  'Downloading': '⬇️ Downloading repository files',
  'Downloaded': '✅ Downloaded',
  'files...': 'files from repository',
  
  // Scanning
  'Scanning repository and generating outline...': '🔍 Analyzing code structure and creating documentation outline...',
  'Scanning project and generating outline...': '🔍 Analyzing project structure and creating documentation outline...',
  'Generated': '📋 Created',
  'chapters outline': 'documentation chapters',
  
  // Indexing
  'Building RAG index for': '📚 Creating search index for',
  'RAG index built with': '✅ Search index created with',
  'chunks': 'code segments indexed',
  
  // Generation
  'Generating documentation for': '✨ Writing documentation for',
  'Generating chapter': '📝 Writing chapter',
  'chapters...': 'chapters (this may take a few minutes)...',
  
  // PDF Generation
  'Generating PDF...': '📄 Creating PDF document...',
  
  // Completion
  'Completed': '✅ Documentation generation completed!',
  'Generation Completed Successfully!': '✅ Documentation generated successfully!',
};

/**
 * Translates a technical backend message into a user-friendly message
 * @param {string} message - The technical message from backend
 * @returns {string} - User-friendly message
 */
export const translateMessage = (message) => {
  if (!message) return message;
  
  let translated = message;
  
  // Check for exact matches first
  if (messageTranslations[message]) {
    return messageTranslations[message];
  }
  
  // Handle dynamic messages with patterns
  // Pattern: "Downloading X files..."
  if (message.includes('Downloading') && message.includes('files...')) {
    const match = message.match(/Downloading (\d+) files\.\.\./);
    if (match) {
      return `⬇️ Downloading ${match[1]} files from repository...`;
    }
  }
  
  // Pattern: "Downloaded X/Y files..."
  if (message.includes('Downloaded') && message.includes('/')) {
    const match = message.match(/Downloaded (\d+)\/(\d+) files\.\.\./);
    if (match) {
      return `✅ Downloaded ${match[1]} of ${match[2]} files`;
    }
  }
  
  // Pattern: "Generated X chapters outline"
  if (message.includes('Generated') && message.includes('chapters outline')) {
    const match = message.match(/Generated (\d+) chapters outline/);
    if (match) {
      return `📋 Created ${match[1]} documentation chapters`;
    }
  }
  
  // Pattern: "Building RAG index for X files..."
  if (message.includes('Building RAG index for')) {
    const match = message.match(/Building RAG index for (\d+) files\.\.\./);
    if (match) {
      return `📚 Creating search index for ${match[1]} files (this may take a minute)...`;
    }
  }
  
  // Pattern: "RAG index built with X chunks"
  if (message.includes('RAG index built with')) {
    const match = message.match(/RAG index built with (\d+) chunks/);
    if (match) {
      return `✅ Search index created with ${match[1]} code segments`;
    }
  }
  
  // Pattern: "Generating documentation for X chapters..."
  if (message.includes('Generating documentation for') && message.includes('chapters...')) {
    const match = message.match(/Generating documentation for (\d+) chapters\.\.\./);
    if (match) {
      return `✨ Writing documentation for ${match[1]} chapters (this may take a few minutes)...`;
    }
  }
  
  // Pattern: "Generating chapter X/Y..."
  if (message.includes('Generating chapter') && message.includes('/')) {
    const match = message.match(/Generating chapter (\d+)\/(\d+)\.\.\./);
    if (match) {
      return `📝 Writing chapter ${match[1]} of ${match[2]}...`;
    }
  }
  
  // Pattern: "Generating documentation from files..."
  if (message.includes('Generating documentation from files')) {
    return '✨ Writing documentation from your files...';
  }
  
  // Pattern: "Starting zip archive documentation generation..."
  if (message.includes('Starting zip archive')) {
    return '🚀 Starting documentation generation from archive...';
  }
  
  // Pattern: "Starting repository documentation generation..."
  if (message.includes('Starting repository documentation')) {
    return '🚀 Starting documentation generation from repository...';
  }
  
  // Apply partial translations for common terms
  Object.keys(messageTranslations).forEach(key => {
    if (message.includes(key) && key.length > 10) { // Only for longer keys to avoid false matches
      translated = translated.replace(key, messageTranslations[key]);
    }
  });
  
  // If no translation found, return original but make it more readable
  if (translated === message) {
    // Capitalize first letter if needed
    if (translated && translated[0] === translated[0].toLowerCase()) {
      translated = translated.charAt(0).toUpperCase() + translated.slice(1);
    }
  }
  
  return translated;
};

/**
 * Gets a user-friendly status description based on status and message
 * @param {string} status - The generation status
 * @param {string} message - The current step message
 * @returns {string} - User-friendly status description
 */
export const getStatusDescription = (status, message) => {
  const baseDescriptions = {
    pending: 'Preparing to start...',
    ingesting: 'Downloading and analyzing files...',
    scanning: 'Analyzing code structure...',
    indexing: 'Creating search index...',
    generating: 'Writing documentation...',
    merging: 'Finalizing document...',
    completed: 'Documentation ready!',
    failed: 'Generation failed',
  };
  
  if (message) {
    const translated = translateMessage(message);
    return translated;
  }
  
  return baseDescriptions[status] || status;
};

export default {
  translateMessage,
  getStatusDescription,
};


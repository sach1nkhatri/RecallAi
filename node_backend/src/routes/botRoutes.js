/**
 * Bot Routes - Proxy to Python Backend
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const multer = require('multer');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const FormData = require('form-data');

// Python backend URL
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// All bot routes require authentication
router.use(protect);

// Helper to make HTTP requests
const makeRequest = (url, options, data) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = httpModule.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);

    if (data) {
      if (typeof data === 'string') {
        req.write(data);
      } else {
        data.pipe(req);
        return;
      }
    }

    req.end();
  });
};

// Helper to proxy JSON requests
const proxyJsonRequest = async (req, res, method, path) => {
  try {
    const url = `${PYTHON_API_URL}${path}`;
    const body = (method === 'POST' || method === 'PUT' || method === 'PATCH')
      ? JSON.stringify(req.body)
      : undefined;

    const response = await makeRequest(url, {
      method,
      headers: {
        'X-User-ID': req.user._id.toString(),
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
        'Content-Length': body ? Buffer.byteLength(body) : 0,
      },
    }, body);

    try {
      const data = JSON.parse(response.body);
      res.status(response.status).json(data);
    } catch (e) {
      res.status(response.status).send(response.body);
    }
  } catch (error) {
    console.error('Error proxying to Python backend:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to communicate with bot service',
    });
  }
};

// Helper to proxy file uploads
const proxyFileUpload = async (req, res, path) => {
  try {
    const url = `${PYTHON_API_URL}${path}`;
    const formData = new FormData();
    
    // Add files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });
    }

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'X-User-ID': req.user._id.toString(),
        'Authorization': req.headers.authorization || '',
        ...formData.getHeaders(),
      },
    };

    const proxyReq = httpModule.request(reqOptions, (proxyRes) => {
      res.status(proxyRes.statusCode);
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Error proxying file upload:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload documents',
      });
    });

    formData.pipe(proxyReq);
  } catch (error) {
    console.error('Error proxying file upload to Python backend:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload documents',
    });
  }
};

// Helper to proxy streaming requests (chat)
const proxyStreamRequest = async (req, res, path) => {
  try {
    const url = `${PYTHON_API_URL}${path}`;
    const body = JSON.stringify(req.body);

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'X-User-ID': req.user._id.toString(),
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const proxyReq = httpModule.request(reqOptions, (proxyRes) => {
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Error proxying stream:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to communicate with bot service',
      });
    });

    proxyReq.write(body);
    proxyReq.end();
  } catch (error) {
    console.error('Error proxying stream to Python backend:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to communicate with bot service',
    });
  }
};

// List all bots
router.get('/', async (req, res) => {
  await proxyJsonRequest(req, res, 'GET', '/api/bots');
});

// Get a specific bot
router.get('/:botId', async (req, res) => {
  await proxyJsonRequest(req, res, 'GET', `/api/bots/${req.params.botId}`);
});

// Create a new bot
router.post('/', async (req, res) => {
  await proxyJsonRequest(req, res, 'POST', '/api/bots');
});

// Update a bot
router.put('/:botId', async (req, res) => {
  await proxyJsonRequest(req, res, 'PUT', `/api/bots/${req.params.botId}`);
});

// Delete a bot
router.delete('/:botId', async (req, res) => {
  await proxyJsonRequest(req, res, 'DELETE', `/api/bots/${req.params.botId}`);
});

// Upload documents for a bot
router.post('/:botId/documents', upload.array('files', 10), async (req, res) => {
  await proxyFileUpload(req, res, `/api/bots/${req.params.botId}/documents`);
});

// List documents for a bot
router.get('/:botId/documents', async (req, res) => {
  await proxyJsonRequest(req, res, 'GET', `/api/bots/${req.params.botId}/documents`);
});

// Chat with a bot
router.post('/:botId/chat', async (req, res) => {
  await proxyStreamRequest(req, res, `/api/bots/${req.params.botId}/chat`);
});

module.exports = router;


/**
 * Settings Controller
 */

const Settings = require('../models/Settings');
const { validationResult } = require('express-validator');

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await Settings.createDefault(req.user._id);
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    let settings = await Settings.findOne({ user: req.user._id });

    // Create if doesn't exist
    if (!settings) {
      settings = await Settings.createDefault(req.user._id);
    }

    // Update allowed fields
    const {
      theme,
      language,
      notifications,
      codeToDoc,
      bot,
      preferences,
    } = req.body;

    if (theme) settings.theme = theme;
    if (language) settings.language = language;
    if (notifications) {
      if (notifications.email !== undefined)
        settings.notifications.email = notifications.email;
      if (notifications.inApp !== undefined)
        settings.notifications.inApp = notifications.inApp;
      if (notifications.usageAlerts !== undefined)
        settings.notifications.usageAlerts = notifications.usageAlerts;
    }
    if (codeToDoc) {
      if (codeToDoc.defaultMode) settings.codeToDoc.defaultMode = codeToDoc.defaultMode;
      if (codeToDoc.autoGenerate !== undefined)
        settings.codeToDoc.autoGenerate = codeToDoc.autoGenerate;
      if (codeToDoc.maxFiles) settings.codeToDoc.maxFiles = codeToDoc.maxFiles;
    }
    if (bot) {
      if (bot.defaultModel) settings.bot.defaultModel = bot.defaultModel;
      if (bot.temperature !== undefined) settings.bot.temperature = bot.temperature;
    }
    if (preferences) {
      // Merge preferences
      Object.keys(preferences).forEach((key) => {
        settings.preferences.set(key, preferences[key]);
      });
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Reset settings to defaults
// @route   POST /api/settings/reset
// @access  Private
const resetSettings = async (req, res) => {
  try {
    await Settings.findOneAndDelete({ user: req.user._id });
    const settings = await Settings.createDefault(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Settings reset to defaults',
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
};


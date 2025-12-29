/**
 * Help and FAQ Controller
 */

const HelpFAQ = require('../models/HelpFAQ');

// @desc    Get all FAQs (public)
// @route   GET /api/help-faq
// @access  Public
const getAllFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const faqs = await HelpFAQ.find(query)
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      faqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get all FAQs (admin)
// @route   GET /api/admin/help-faq
// @access  Private (Admin)
const getAllFAQsAdmin = async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = {};
    if (category) {
      query.category = category;
    }

    const faqs = await HelpFAQ.find(query)
      .populate('createdBy', 'username')
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      faqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Create FAQ
// @route   POST /api/admin/help-faq
// @access  Private (Admin)
const createFAQ = async (req, res) => {
  try {
    const { category, question, answer, order } = req.body;

    if (!category || !question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Category, question, and answer are required',
      });
    }

    const faq = await HelpFAQ.create({
      category,
      question,
      answer,
      order: order || 0,
      createdBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      faq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Update FAQ
// @route   PUT /api/admin/help-faq/:id
// @access  Private (Admin)
const updateFAQ = async (req, res) => {
  try {
    const { category, question, answer, order, isActive } = req.body;

    const faq = await HelpFAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
      });
    }

    if (category) faq.category = category;
    if (question) faq.question = question;
    if (answer) faq.answer = answer;
    if (order !== undefined) faq.order = order;
    if (isActive !== undefined) faq.isActive = isActive;

    await faq.save();

    res.status(200).json({
      success: true,
      faq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/admin/help-faq/:id
// @access  Private (Admin)
const deleteFAQ = async (req, res) => {
  try {
    const faq = await HelpFAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
      });
    }

    await faq.deleteOne();

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

module.exports = {
  getAllFAQs,
  getAllFAQsAdmin,
  createFAQ,
  updateFAQ,
  deleteFAQ,
};


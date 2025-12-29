/**
 * User Controller
 */

const User = require('../models/User');

// @desc    Get user usage statistics
// @route   GET /api/users/usage
// @access  Private
const getUsage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Reset daily usage if needed
    user.resetDailyUsage();
    await user.save();

    // Fetch actual bot count from Python backend
    let botCount = user.usage.bots.current; // Default to stored count
    try {
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5001';
      const response = await fetch(`${pythonApiUrl}/api/bots`, {
        headers: {
          'Authorization': req.headers.authorization || '',
          'X-User-ID': req.user._id.toString(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with bots array
        const bots = Array.isArray(data) ? data : (data.bots || []);
        botCount = Array.isArray(bots) ? bots.length : 0;
        // Update stored count
        user.usage.bots.current = botCount;
        await user.save();
      }
    } catch (error) {
      console.error('Failed to fetch bot count from Python backend:', error);
      // Use stored count if fetch fails
    }

    res.status(200).json({
      success: true,
      usage: {
        bots: {
          current: botCount,
          limit: user.usage.bots.limit,
        },
        chats: {
          today: user.usage.chats.today,
          limit: user.usage.chats.limit,
        },
        codeToDoc: {
          used: user.usage.codeToDoc.used,
          limit: user.usage.codeToDoc.limit,
        },
        tokens: {
          used: user.usage.tokens.used,
          limit: user.usage.tokens.limit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Increment usage counter
// @route   POST /api/users/usage/increment
// @access  Private
const incrementUsage = async (req, res) => {
  try {
    const { type, amount = 1 } = req.body;
    const user = await User.findById(req.user._id);

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Usage type is required',
      });
    }

    // Reset daily usage if needed
    user.resetDailyUsage();

    // Increment usage
    switch (type) {
      case 'bots':
        user.usage.bots.current += amount;
        break;
      case 'chats':
        user.usage.chats.today += amount;
        break;
      case 'codeToDoc':
        user.usage.codeToDoc.used += amount;
        break;
      case 'tokens':
        user.usage.tokens.used += amount;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid usage type',
        });
    }

    await user.save();

    res.status(200).json({
      success: true,
      usage: user.usage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Update user plan
// @route   PUT /api/users/plan
// @access  Private
const updatePlan = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['free', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type',
      });
    }

    const user = await User.findById(req.user._id);
    user.plan = plan;
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Soft delete - mark as inactive
    user.isActive = false;
    await user.save();

    // Or hard delete:
    // await User.findByIdAndDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

module.exports = {
  getUsage,
  incrementUsage,
  updatePlan,
  deleteAccount,
};


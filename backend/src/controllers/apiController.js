import Item from '../models/Item.js';

export const getWelcome = async (req, res) => {
  try {
    const itemCount = await Item.countDocuments();
    const activeItems = await Item.getActiveItems().limit(5);

    res.json({
      message: 'Welcome to the Fullstack Docker API!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        totalItems: itemCount,
        recentItems: activeItems
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Welcome to the Fullstack Docker API!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        status: 'error',
        error: error.message
      }
    });
  }
};

export const getItems = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const query = status ? { status } : {};

    const [items, total] = await Promise.all([
      Item.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(),
      Item.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: items.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createItem = async (req, res) => {
  try {
    const { name, description, status, metadata } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const item = await Item.create({
      name,
      description,
      status,
      metadata
    });

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { name, description, status, metadata } = req.body;

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { name, description, status, metadata },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const archiveItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    await item.archive();

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await Item.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Item.countDocuments();

    res.json({
      success: true,
      data: {
        total,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

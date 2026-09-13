const User = require('../models/User');

module.exports = async function (req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const user = await User.findById(req.user.id).select('isAdmin');
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }

    if (user.isAdmin === true) {
      req.user.isAdmin = true;
      return next();
    }

    return res.status(403).json({ msg: 'Access denied: Admin privileges required' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

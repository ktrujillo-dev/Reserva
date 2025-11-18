const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      req.user = decoded.user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, sin token' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
    }

    const hasPermission = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (hasPermission) {
      next();
    } else {
      res.status(403).json({ message: 'No tienes los permisos necesarios para realizar esta acción.' });
    }
  };
};

module.exports = { protect, authorize };


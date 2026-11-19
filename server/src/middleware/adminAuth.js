export default function adminAuth(req, res, next) {
  const password = process.env.ADMIN_PASSWORD;
  const provided = req.header('x-admin-password');
  if (!password || !provided || provided !== password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

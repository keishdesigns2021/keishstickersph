require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const { ready } = require('./db');
const { seedAdmin, seedProducts } = require('./seed');
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const contactRouter = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

app.get('/api/config', (req, res) => {
  res.json({
    shopName: process.env.SHOP_NAME,
    email: process.env.SHOP_EMAIL,
    phone: process.env.SHOP_PHONE,
    address: process.env.SHOP_ADDRESS,
    facebook: process.env.SHOP_FACEBOOK,
  });
});

app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/contact', contactRouter);

app.use(express.static(path.join(__dirname, '..', 'public')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

ready
  .then(() => seedAdmin())
  .then(() => seedProducts())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Keish Stickers & Apparel PH server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

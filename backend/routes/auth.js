// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  console.log('Signup request received:', { email: req.body.email, name: req.body.name });
  
  const { name, email, password } = req.body;
  
  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password: hashed 
    });
    
    console.log('User created successfully:', { id: user._id, email: user.email });
    
    res.status(201).json({ 
      message: 'User created successfully', 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name 
      } 
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  console.log('Login request received:', { email: req.body.email });
  
  const { email, password } = req.body;
  
  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );
    
    console.log('Login successful for user:', { id: user._id, email: user.email });
    
    res.json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get user profile (protected route)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get wallet addresses for authenticated user
router.get('/wallet', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.wallets || user.wallets.length === 0) {
      return res.status(400).json({ error: 'No wallets added' });
    }
    
    res.json({ wallets: user.wallets });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add wallet address (moved from wallet.js for consistency)
router.post('/add-wallet', auth, async (req, res) => {
  const { wallet } = req.body;
  
  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address required' });
  }
  
  // Basic Ethereum address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
  }
  
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { wallets: wallet } }, // $addToSet prevents duplicates
      { new: true }
    );
    
    res.json({ 
      message: 'Wallet added successfully', 
      wallet,
      totalWallets: user.wallets.length 
    });
  } catch (err) {
    console.error('Add wallet error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test route for debugging
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes are working!', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/signup',
      'POST /api/auth/login', 
      'GET /api/auth/profile (requires auth)',
      'GET /api/auth/wallet (requires auth)',
      'POST /api/auth/add-wallet (requires auth)'
    ]
  });
});

module.exports = router;
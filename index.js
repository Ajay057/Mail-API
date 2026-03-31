require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
// Restrict CORS to only allow your static site to make requests
const allowedOrigins = process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : ['*'];
app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes('*')) return callback(null, true);

    // Normalize both the allowed origins and incoming origin to prevent trailing slash errors
    const isAllowed = allowedOrigins.some(allowed => {
      const cleanAllowed = allowed.trim().toLowerCase().replace(/\/$/, '');
      const cleanOrigin = origin ? origin.trim().toLowerCase().replace(/\/$/, '') : '';
      return cleanAllowed === cleanOrigin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Unauthorized: Request blocked by CORS policy.'));
    }
  }
}));
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded form data

// Create email transporter
// We are using Gmail in this example, but you can change the service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Root endpoint just to check if server is running
app.get('/', (req, res) => {
  res.send('Mail API is up and running!');
});

// The POST endpoint called by your static site
app.post('/api/contact', async (req, res) => {
  try {
    // Extract any data sent from the frontend
    const bodyData = req.body;

    // --- SECURITY OVERRIDES ---

    // 1. Honeypot check: If a bot fills out our invisible trap field, pretend it succeeded
    if (bodyData._honeypot) {
      console.log('Blocked spam bot via honeypot field');
      // Return success so the bot is fooled into moving on
      return res.status(200).json({ success: true, message: 'Email sent successfully!' });
    }

    // Remove the honeypot field so it doesn't get emailed to you
    delete bodyData._honeypot;

    // Format the incoming data into a readable email text format
    let emailText = 'New submission from your website:\n\n';
    for (const [key, value] of Object.entries(bodyData)) {
      emailText += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}\n`;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER, // fallback to sending to yourself
      subject: `New Website Contact Form Submission`,
      text: emailText,
      replyTo: bodyData.email // Allows you to reply directly to the sender if they provided an 'email' field
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// Custom error handler to send proper JSON instead of crashing with 500 when CORS or Postman is blocked
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Forbidden: Request strictly blocked by CORS policy.' });
  }
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Export the Express app for serverless deployment (Vercel)
module.exports = app;

// Start the local server if not running in production
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

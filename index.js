require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Submission = require('./models/Submission');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));
} else {
  console.log('MongoDB skip: MONGODB_URI not provided.');
}

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : ['*'];
app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes('*')) return callback(null, true);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Mail API is up and running!');
});

// The POST endpoint called by your static site
app.post('/api/contact', async (req, res) => {
  try {
    const bodyData = req.body;

    // 1. Honeypot check
    if (bodyData._honeypot) {
      console.log('Blocked spam bot via honeypot field');
      return res.status(200).json({ success: true, message: 'Email sent successfully!' });
    }

    delete bodyData._honeypot;

    // --- MONGODB PERSISTENCE ---
    if (process.env.MONGODB_URI) {
      try {
        const newSubmission = new Submission({
          data: bodyData,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        await newSubmission.save();
        console.log('Submission saved to MongoDB');
      } catch (dbError) {
        console.error('Error saving to MongoDB:', dbError.message);
      }
    }

    // Format the incoming data into a readable email text & html format
    let emailText = 'New submission from your website:\n\n';
    let emailHtml = `
      <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eaeaea; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-top: 5px;">New Form Submission</h2>
        <p style="font-size: 16px; margin-bottom: 25px;">You have received a new message via your website.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    `;

    for (const [key, value] of Object.entries(bodyData)) {
      if (key.toLowerCase() === 'subject') continue;
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
      emailText += `${formattedKey}: ${value}\n`;
      emailHtml += `
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eee; font-weight: 600; width: 35%; color: #555; background-color: #fafafa;">${formattedKey}</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #222;">${value}</td>
          </tr>
      `;
    }

    emailHtml += `
        </table>
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #f0f0f0; font-size: 13px; color: #888; text-align: center;">
          Sent automatically from Insectura Private Limited Website
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Insectura Private Limited" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      ...(process.env.EMAIL_BCC && { bcc: process.env.EMAIL_BCC }),
      subject: bodyData.subject || `New Website Contact Form Submission`,
      text: emailText,
      html: emailHtml,
      replyTo: bodyData.email || bodyData.Email
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email sent successfully!' });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// Custom error handler
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

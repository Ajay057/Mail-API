# Mail API

A simple Node.js application to receive form submissions from a static site and forward them to your email using Nodemailer.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   - Copy `.env.example` to a new file named `.env`
   - Fill in your email credentials. If you are using Gmail, you **must** use an [App Password](https://support.google.com/accounts/answer/185833), *not* your regular login password.

3. **Run Locally:**
   ```bash
   npm start
   ```

## Using from your Static Website

You can send data from your frontend using standard `fetch`. Here is an example:

```javascript
fetch('http://localhost:3000/api/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello, this is a test message from my static site!'
  })
})
.then(response => response.json())
.then(data => {
  if(data.success) {
    alert('Email sent!');
  } else {
    alert('Error: ' + data.message);
  }
});
```

*(Once deployed, replace `http://localhost:3000` with your real server URL).*

## Deployment

You can host this repository for free on platforms like **Render**, **Railway**, or **Koyeb**. 

**Important Deployment Steps:**
1. Upload this code to a GitHub repository.
2. Connect the repository to your hosting provider.
3. Add the **Environment Variables** (`EMAIL_USER`, `EMAIL_PASS`, `EMAIL_TO`) in your hosting provider's dashboard settings. Do NOT commit your `.env` file to GitHub!

#!/usr/bin/env node
/**
 * test_smtp.js - Diagnostic tool for external SMTP connectivity
 * Run this on your Raspberry Pi to verify your credentials.
 */

const nodemailer = require('nodemailer');

// Load settings from .env if present (relative to project root)
require('dotenv').config({ path: './rental-platform/backend/.env' });

async function test() {
  console.log('🚀 Starting SMTP Diagnostic...');

  const options = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  };

  console.log(`📡 Connecting to ${options.host}:${options.port} as ${options.user}...`);

  const transporter = nodemailer.createTransport(options);

  try {
    // 1. Verify Connection
    await transporter.verify();
    console.log('✅ SUCCESS: Connection and Authentication verified!');

    // 2. Send Test Email
    const target = process.env.SMTP_USER; // Send to yourself
    console.log(`📧 Sending test email to ${target}...`);

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || options.user,
      to: target,
      subject: 'BestFlats.vip SMTP Test',
      text: 'If you are reading this, your Raspberry Pi is now successfully connected to the real world!',
    });

    console.log('✨ TEST COMPLETED: Message sent successfully.');
    console.log('Message ID:', info.messageId);

  } catch (err) {
    console.error('❌ FAILURE: SMTP test failed.');
    console.error('Error Details:', err.message);
    
    if (err.message.includes('Connection refused')) {
      console.log('\n💡 Tip: Your Pi or Router might be blocking outbound port 587.');
    } else if (err.message.includes('Authentication failed')) {
      console.log('\n💡 Tip: Check your password. If using Gmail, you MUST use an "App Password".');
    }
  }
}

test();

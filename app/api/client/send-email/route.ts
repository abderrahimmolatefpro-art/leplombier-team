import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email transporter configuration
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, clientName } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Destinataire, sujet et message sont requis' },
        { status: 400 }
      );
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .message { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3B82F6; white-space: pre-wrap; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${subject}</h1>
            </div>
            <div class="content">
              <div class="message">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <div class="footer">
                <p>Ce message a été envoyé depuis le CRM Plomberie</p>
                <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}

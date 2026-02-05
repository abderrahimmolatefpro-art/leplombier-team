import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

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

    const result = await sendEmail(to, subject, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Email envoyé avec succès via ${result.method}`,
        method: result.method,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Erreur lors de l\'envoi de l\'email',
          debug: {
            hasInfobipApiKey: !!process.env.INFOBIP_API_KEY,
            hasInfobipBaseUrl: !!process.env.INFOBIP_BASE_URL,
            hasSmtpHost: !!process.env.SMTP_HOST,
            hasSmtpUser: !!process.env.SMTP_USER,
            hasSmtpPass: !!process.env.SMTP_PASS,
          },
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ [EMAIL API] Erreur générale:', {
      message: error?.message,
      errorName: error?.name,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}

import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, telefono, tipoEvento, data, location, messaggio } = body;

    const { data: emailData, error } = await resend.emails.send({
      from: 'Mommy DJ Richieste <onboarding@resend.dev>',
      to: ['mommydjsalmani@gmail.com'],
      subject: `Nuova richiesta: ${tipoEvento || 'Informazioni'}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4169e1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .field { margin-bottom: 15px; }
              .label { font-weight: bold; color: #4169e1; }
              .value { margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎵 Nuova Richiesta da Mommy DJ</h1>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">👤 Nome:</div>
                  <div class="value">${nome}</div>
                </div>
                
                <div class="field">
                  <div class="label">📧 Email:</div>
                  <div class="value"><a href="mailto:${email}">${email}</a></div>
                </div>
                
                <div class="field">
                  <div class="label">📱 Telefono:</div>
                  <div class="value"><a href="tel:${telefono}">${telefono}</a></div>
                </div>
                
                ${tipoEvento ? `
                <div class="field">
                  <div class="label">🎉 Tipo Evento:</div>
                  <div class="value">${tipoEvento}</div>
                </div>
                ` : ''}
                
                ${data ? `
                <div class="field">
                  <div class="label">📅 Data:</div>
                  <div class="value">${data}</div>
                </div>
                ` : ''}
                
                ${location ? `
                <div class="field">
                  <div class="label">📍 Location:</div>
                  <div class="value">${location}</div>
                </div>
                ` : ''}
                
                ${messaggio ? `
                <div class="field">
                  <div class="label">💬 Messaggio:</div>
                  <div class="value" style="white-space: pre-wrap;">${messaggio}</div>
                </div>
                ` : ''}
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                
                <div style="font-size: 12px; color: #666;">
                  <p>Richiesta ricevuta dal sito mommydj.com</p>
                  <p>Data e ora: ${new Date().toLocaleString('it-IT')}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: emailData });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Errore durante l\'invio della richiesta' }, { status: 500 });
  }
}

const nodemailer = require('nodemailer');
const OpenAI = require('openai');
const { NextResponse } = require('next/server');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sendEmail = async (reportData, userEmail) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Prepare email options
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: userEmail,
    subject: `Safety Report: ${reportData.hazard}`,
    text: JSON.stringify(reportData), // Simplified for example, use formatted output
  };

  if (process.env.PDF_GENERATION_ENABLED && reportData.pdfBuffer) {
    mailOptions.attachments = [{
      filename: `Report_${Date.now()}.pdf`,
      content: reportData.pdfBuffer,
      contentType: 'application/pdf'
    }];
  }

  return transporter.sendMail(mailOptions);
};

const processVoiceInput = async (voiceInputData) => {
  const fields = voiceInputData.fields;
  // Implement voice processing if needed, using OpenAI or other libraries
  const prompt = `Convert this voice input into a report: ${JSON.stringify(fields)}`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    temperature: 0.1,
    messages: [ { role: 'user', content: prompt } ],
  });

  const report = JSON.parse(completion.choices[0].message.content);
  return report;
};

// Example main function
const handleVoiceToEmailPipeline = async (req) => {
  const authResult = await validateAuthToken(req);
  if (authResult.error) return authResult.error;

  const voiceInputData = await req.json();
  const report = await processVoiceInput(voiceInputData);

  // Fetch user email
  const userEmail = authResult.user.email;

  const emailResponse = await sendEmail(report, userEmail);
  return NextResponse.json({
    message: 'Report emailed successfully',
    status: emailResponse.accepted.length > 0 ? 'success' : 'failure'
  });
};

module.exports = { handleVoiceToEmailPipeline };
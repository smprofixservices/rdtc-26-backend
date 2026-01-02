/* ---------------- IMPORTS ---------------- */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
require('dotenv').config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

/* ---------------- HEALTH CHECK ---------------- */
app.get('/healthz', (req, res) => res.send('OK'));

/* ---------------- SENDGRID SETUP (HTTP API) ---------------- */
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* ---------------- MONGODB CONNECTION ---------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✔'))
  .catch(err => console.error('MongoDB Error:', err));

/* ---------------- MONGOOSE SCHEMA ---------------- */
const DiscipleSchema = new mongoose.Schema({
  matricNo: String,
  serialNo: Number,
  year: Number,
  version: String,
  fullName: String,
  dob: Date,
  phone: String,
  occupation: String,
  email: String,
  gifting: String,
  churchName: String,
  pastorName: String,
  churchAddress: String,
  consent: String,
  guardianName: String,
  guardianPhone: String,
  about: String,
  goals: String,
  values: String,
  expectations: String,
  truth: Boolean,
  rules: Boolean,
  attendance: Boolean,
  confidential: Boolean
}, { timestamps: true });

const Disciple = mongoose.model('Disciple', DiscipleSchema);

/* ---------------- REGISTER ROUTE ---------------- */
app.post('/register', async (req, res) => {
  try {
    const data = req.body;

    // Convert checkboxes to boolean
    ['truth','rules','attendance','confidential'].forEach(
      k => data[k] = !!data[k]
    );

    // Generate Serial & Matric Number
    const lastStudent = await Disciple.findOne().sort({ createdAt: -1 });
    const serialNo = lastStudent?.serialNo ? lastStudent.serialNo + 1 : 1;

    if (serialNo > 300) {
      return res.status(400).json({ message: 'Registration limit reached' });
    }

    const matricNo = `RNB/2026/DTC/${String(serialNo).padStart(3, '0')}`;
    data.serialNo = serialNo;
    data.matricNo = matricNo;

    // Save to MongoDB
    await new Disciple(data).save();

    /* ---------------- EMAIL (UNCHANGED MESSAGE + ATTACHMENT) ---------------- */
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
      <div style="max-width:700px;margin:auto;background:#111;color:#fff;border-radius:8px;overflow:hidden">
        <div style="background:linear-gradient(135deg,rgba(173,216,230,.5),rgba(0,0,128,.5),rgba(255,69,0,.3));padding:30px;text-align:center">
          <h2>Revive NUB Discipleship Training Course</h2>
          <p>Notification of Offer of Provisional Admission</p>
        </div>

        <div style="padding:30px">
          <p>Dear <strong>${data.fullName}</strong>,</p>

          <p>
            We are pleased to inform you that you have been offered
            <strong>provisional admission</strong> into the
            <strong>Revive NUB Discipleship Training Course (RDTC-26)</strong>.
          </p>

          <div style="background:#1e1e1e;border-left:4px solid #d4af37;padding:15px;margin:20px 0">
            <strong>Matriculation Number</strong><br/>
            <span style="font-size:18px;color:#d4af37">${matricNo}</span>
          </div>

          <p>
            Kindly find attached the official <strong>RDTC Student Guide</strong>.
          </p>

          <a href="https://chat.whatsapp.com/IV38qRxtveS8JuP92eJboZ"
             style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:5px;text-decoration:none">
            Join WhatsApp Group
          </a>

          <p><br/>Admissions Office<br/><strong>Revive NUB</strong></p>
        </div>
      </div>
    </div>
    `;

    try {
      await sgMail.send({
        to: data.email,
        from: process.env.EMAIL_FROM,
        subject: 'Notification of Offer of Provisional Admission',
        html: emailHtml,
        attachments: [
          {
            content: fs.readFileSync('./public/RDTC Student Guide.pdf').toString('base64'),
            filename: 'RDTC Student Guide.pdf',
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      });
      console.log(`Email sent to ${data.email} ✔`);
    } catch (emailErr) {
      console.error('SendGrid error:', emailErr);
    }

    res.json({
      message: 'Registration successful',
      matricNo
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/* ---------------- IMPORTS ---------------- */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your frontend files

/* ---------------- HEALTH CHECK (Render) ---------------- */
app.get('/healthz', (req, res) => res.send('OK'));

/* ---------------- MONGODB CONNECTION ---------------- */
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB Connected ✔'))
  .catch(err => console.error('MongoDB Error:', err));

/* ---------------- SENDGRID TRANSPORTER ---------------- */
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',                // literally the word "apikey"
    pass: process.env.SENDGRID_API_KEY
  }
});

transporter.verify(err => {
  if (err) console.error('SendGrid config error:', err);
  else console.log('SendGrid ready ✔');
});

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
    ['truth','rules','attendance','confidential'].forEach(k => data[k] = !!data[k]);

    // Generate Serial & Matric Number
    const lastStudent = await Disciple.findOne().sort({ createdAt: -1 });
    let serialNo = lastStudent?.serialNo ? lastStudent.serialNo + 1 : 1;

    if (serialNo > 300) return res.status(400).json({ message: 'Registration limit reached' });

    const matricNo = `RNB/2026/DTC/${String(serialNo).padStart(3,'0')}`;
    data.serialNo = serialNo;
    data.matricNo = matricNo;

    await new Disciple(data).save();

    // Send Email
    const mailOptions = {
      from: `"Revive NUB RDTC" <${process.env.EMAIL_FROM}>`,
      to: data.email,
      subject: 'Notification of Provisional Admission',
      html: `
        <div style="font-family:Arial;background:#f4f4f4;padding:20px">
          <div style="max-width:700px;margin:auto;background:#111;color:#fff;border-radius:8px">
            <div style="padding:30px;text-align:center;background:linear-gradient(135deg,#add8e6,#000080,#ff4500)">
              <img src="https://yourdomain.com/logo.png" style="max-width:120px"><br>
              <h2>Revive NUB Discipleship Training Course</h2>
              <p>Provisional Admission</p>
            </div>
            <div style="padding:30px">
              <p>Dear <strong>${data.fullName}</strong>,</p>
              <p>You have been offered provisional admission into <strong>RDTC-26</strong>.</p>
              <div style="background:#1e1e1e;border-left:4px solid #d4af37;padding:15px;margin:20px 0">
                <strong>Matric Number:</strong><br>
                <span style="font-size:18px;color:#d4af37">${matricNo}</span>
              </div>
              <p>Find attached the RDTC Student Guide.</p>
              <a href="https://chat.whatsapp.com/IV38qRxtveS8JuP92eJboZ"
                 style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:5px;text-decoration:none">
                Join WhatsApp Group
              </a>
              <p><br>Admissions Office<br><strong>Revive NUB</strong></p>
            </div>
          </div>
        </div>
      `,
      attachments: [{
        filename: 'RDTC Student Guide.pdf',
        path: './public/RDTC Student Guide.pdf'
      }]
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Registration successful', matricNo });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 10000; // Render uses assigned port
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

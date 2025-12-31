const nodemailer = require('nodemailer');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your front-end from 'public'

// ---------------- MongoDB Connection ----------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected..."))
  .catch(err => console.error("MongoDB connection error:", err));

// ---------------- Nodemailer Transporter ----------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS  // App password generated
  }
});

transporter.verify((error, success) => {
  if (error) console.log("Email config error:", error);
  else console.log("Email server ready ✔");
});

// ---------------- Schema / Model ----------------
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

const Disciple = mongoose.model("Disciple", DiscipleSchema);

// ---------------- API Route ----------------
app.post("/register", async (req, res) => {
  try {
    console.log("Received form data:", req.body);

    const data = req.body;
    ['truth','rules','attendance','confidential'].forEach(name => {
      data[name] = !!data[name]; // Convert checkboxes to boolean
    });

   // ---------------- Generate Serial & Matric Number ----------------

// 1️⃣ Get last registered student
const lastStudent = await Disciple.findOne().sort({ createdAt: -1 });

// 2️⃣ Start serial number
let serialNo = 1;

if (lastStudent && lastStudent.serialNo) {
  serialNo = lastStudent.serialNo + 1;
}

// 3️⃣ Optional limit (safety)
if (serialNo > 300) {
  return res.status(400).json({
    message: "Registration limit reached"
  });
}

// 4️⃣ Generate matric number
const matricNo = `RNB/2026/DTC/${String(serialNo).padStart(3, '0')}`;

// 5️⃣ Attach to data
data.serialNo = serialNo;
data.matricNo = matricNo;

// 6️⃣ Save to database
const newEntry = new Disciple(data);
await newEntry.save();


    // ---------------- Send Email ----------------
    const mailOptions = {
  from: `"Revive NUB RDTC" <${process.env.EMAIL_USER}>`,
  to: data.email,
  subject: "Notification of Offer of Provisional Admission",
  html: `
  <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">

    <div style="
      max-width:700px;
      margin:auto;
      background:#111;
      color:#fff;
      border-radius:8px;
      overflow:hidden;
    ">

      <!-- HEADER -->
      <div style="
        background: linear-gradient(135deg, rgba(173,216,230,0.5), rgba(0,0,128,0.5), rgba(255,69,0,0.3));
        padding:30px;
        text-align:center;
      ">
        <img 
          src="https://yourdomain.com/logo.png"
          alt="Revive NUB Logo"
          style="max-width:120px; margin-bottom:10px;"
        />

        <h2 style="margin:0; color:#fff;">
          Revive NUB Discipleship Training Course
        </h2>

        <p style="margin-top:8px; font-size:15px;">
          Notification of Offer of Provisional Admission
        </p>
      </div>

      <!-- BODY -->
      <div style="padding:30px">

        <p>Dear <strong>${data.fullName}</strong>,</p>

        <p>
          We are pleased to inform you that you have been offered 
          <strong>provisional admission</strong> into the 
          <strong>Revive NUB Discipleship Training Course (RDTC-26)</strong>.
        </p>

        <div style="
          background:#1e1e1e;
          border-left:4px solid #d4af37;
          padding:15px;
          margin:20px 0;
        ">
          <p style="margin:0;">
            <strong>Matriculation Number</strong><br/>
            <span style="font-size:18px; color:#d4af37;">
              ${matricNo}
            </span>
          </p>
        </div>

        <p>
          This admission is subject to your full participation and strict
          compliance with the rules and regulations of RDTC.
        </p>

        <p>
          Kindly find attached the official <strong>RDTC Student Guide</strong>
          for further instructions.
        </p>

        <br/>
        <a href="https://chat.whatsapp.com/IV38qRxtveS8JuP92eJboZ" 
      style="display:inline-block; padding:10px 20px; background-color:#25D366; color:white; text-decoration:none; border-radius:5px;">
      Join WhatsApp Group
  </a>


        <p>
          Congratulations once again.<br/><br/>
          <strong>Admissions Office</strong><br/>
          Revive NUB
        </p>

      </div>

    </div>
  </div>
  `,

  attachments: [
    {
      filename: "RDTC Student Guide.pdf",
      path: "./public/RDTC Student Guide.pdf",
      contentType: "application/pdf"
    }
  ]
};


    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error("Email sending error:", err);
      else console.log("Email sent:", info.response);
    });

    return res.status(200).json({ message: "Registration successful!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error saving registration", error: error.message });
  }
});
// Health check endpoint for Render
app.get('/healthz', (req, res) => {
  res.send('OK');
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

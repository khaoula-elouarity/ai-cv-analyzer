# 🚀 CVision AI — AI CV Analyzer & Smart Job Matcher

A production-ready, full-stack MERN SaaS application that evaluates CVs using xAI (Grok API), performs OCR on images/scanned documents, calculates transparent CV scores, and matches candidates with job descriptions.

---

## 📋 Features
- **Secure Authentication:** JWT-based user authentication with bcrypt password hashing.
- **Advanced Document Processing:** Supports PDF, DOCX, PNG, and JPG file uploads with automated text extraction and Tesseract.js OCR support.
- **xAI (Grok) Integration:** Server-side AI analysis that converts unstructured CV text into structured, validated JSON data.
- **Transparent CV Scoring:** Multi-category weighted scoring system (Skills, Experience, Education, Projects, etc.).
- **Smart Job Matcher:** Compares candidate profiles against job descriptions to compute compatibility percentages and identify missing skills.
- **Modern SaaS UI/UX:** Built with React, Vite, Tailwind CSS, Lucide icons, and interactive data visualization.

---

## 🛠️ Tech Stack
- **Frontend:** React.js, Vite, Tailwind CSS, Lucide React, Axios, Recharts
- **Backend:** Node.js, Express.js, Mongoose, JWT, bcryptjs, Multer, Tesseract.js, pdf-parse, mammoth
- **Database:** MongoDB Atlas

---

## ⚙️ Environment Variables (.env)

### Server (`server/.env`)
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
XAI_API_KEY=your_xai_api_key
XAI_MODEL=grok-4.7

### Client (`client/.env`)
VITE_API_URL=http://localhost:5000/api

---

## 📥 Installation & Local Running

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/ai-cv-analyzer.git](https://github.com/YOUR_USERNAME/ai-cv-analyzer.git)
   cd ai-cv-analyzer
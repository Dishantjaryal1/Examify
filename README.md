# 🎓 Examify – Online Examination & Certification Platform

**Examify** is a full-featured online examination and certification platform built using the **MERN stack**. It offers a secure, seamless, and role-based environment for conducting, managing, and monitoring online exams. The system is designed to provide separate dashboards for **Students** and **Examiners**, ensuring an optimized experience for each role.

---

## 🚀 Key Features

### 👥 Role-Based Access

- **Student Dashboard:** View and attempt assigned exams, track performance, and download certificates.
- **Examiner Dashboard:** Create and manage exams, evaluate results, and monitor student activity.

### 🧠 Examination System

- **Timed Tests:** Each exam is strictly time-bound, automatically submitted upon timeout.
- **Randomized Questions:** Questions are randomized to prevent cheating.
- **Instant Evaluation:** Results are auto-graded and displayed immediately upon completion.

### 🛡️ Anti-Cheating Mechanisms

- **Copy-Paste Disabled:** Restricts clipboard actions during the exam.
- **Camera Proctoring:** Uses webcam monitoring to ensure student authenticity and prevent malpractice.
- **Tab/Window Switching Detection:** Tracks suspicious activity like navigating away from the exam window.
- **Full-Screen Enforcement:** Keeps the student focused within the exam environment.

### 🏅 Certification System

- Students who successfully pass an exam can **instantly generate and download a certificate** with verified details such as name, exam title, date, and score.

---

## 🧩 Tech Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| **Frontend**       | React.js, Vite, Tailwind CSS, Axios |
| **Backend**        | Node.js, Express.js                 |
| **Database**       | MongoDB (Mongoose)                  |
| **Authentication** | JWT (JSON Web Token)                |

---

## 📊 Modules Overview

### Student Dashboard

- View registered and available exams
- Attempt exams within allocated time
- View results and performance analytics
- Download certificates for passed exams

### Examiner Dashboard

- Create, edit, and delete exams
- Upload questions
- Monitor live student activity and results
- Manage question banks and difficulty levels

---

## 🧰 Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/dishantjaryal1/examify.git
cd examify
```

### 2️⃣ Setup the backend

```bash
cd backend
npm install
npm run dev
```

### 3️⃣ Setup the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4️⃣ Environment Variables

Create a `.env` file in both backend and frontend folders and configure:

```
MONGO_URI = your_mongodb_connection_string
JWT_SECRET = your_secret_key
PORT = 5000
```

---

## 🧪 Future Enhancements

- AI-based face recognition for proctoring
- Integration with email notifications for exam invites and results
- Advanced analytics and reporting for examiners
- Multi-language support

---

## 💡 Purpose

Examify aims to **simplify and secure the online examination process**, enabling institutions and educators to conduct exams effortlessly while ensuring fairness and integrity through advanced proctoring mechanisms.

---

**Developed with ❤️ by [Dishant Jaryal]**

> “Empowering Education through Secure Digital Assessment.”

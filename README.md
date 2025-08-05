# ✅ Project: CampusConnectPlayHub

## 📁 What I’ve Done So Far

- ✅ Set up **backend server** using **Node.js** + **Express**
- ✅ Connected to **MySQL database**
- ✅ Created **basic user registration & login**
- ✅ Used **Postman** to test API endpoints (register, login)
- ✅ Setup `.env` file and server is working locally
- ✅ Uploaded project to GitHub

---

## 🚀 How to Run This Project Locally

> 💡 Follow these steps exactly:

### 1️⃣ Prerequisites (Install once)

- Node.js & npm (https://nodejs.org/)
- XAMPP (https://www.apachefriends.org/)
- VS Code (optional but helpful)
- Git

---

### 2️⃣ Clone the Repo

```bash
git clone https://github.com/sleeping-f/CampusConnectPlayHub.git
cd CampusConnectPlayHub
```

---

### 3️⃣ Setup Backend

```bash
cd backend
npm install
```

---

### 4️⃣ Setup `.env` File

Create a `.env` file inside the `backend/` folder with the following content (edit the password if needed):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=your_database_name_here
JWT_SECRET=someSuperSecretKey
PORT=5000
```

---

### 5️⃣ Start XAMPP

- Open XAMPP
- Start **Apache** and **MySQL**
- Open phpMyAdmin and create the database manually or import SQL if available

---

### 6️⃣ Run the Backend Server

```bash
npx nodemon server.js
```

It should show: `Server running on http://localhost:5000`

---

### 7️⃣ Test API (Optional)

Use **Postman** or browser to hit:

- POST `http://localhost:5000/api/register`
- POST `http://localhost:5000/api/login`

---

## 📌 Notes for Teammates

- Don't forget to `npm install` after cloning.
- Backend is working, no frontend yet.
- I’ll help you with testing in Postman if needed.
- We’ll add frontend + more features step by step.

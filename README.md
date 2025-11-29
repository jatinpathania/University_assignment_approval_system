TaskNet 🎓

TaskNet is a robust, role-based web application designed to streamline the assignment submission and approval process within a university. Built with Node.js and MongoDB, it features secure authentication, role-specific dashboards, and cloud-based file management.

🚀 Key Features

🔐 Authentication & Security

Role-Based Access Control (RBAC): Distinct workflows and permissions for Admins, HODs, Professors, and Students.

Secure Login: JWT-based session management using HTTP-only cookies.

Data Protection: Password hashing using bcryptjs for enhanced security.

👨‍💼 Admin Module

Dashboard Overview: Real-time statistics on total users, departments, and active roles.

User Management: Full CRUD capabilities (Create, Edit, Delete) for users, with role assignment and search functionality.

Department Management: Tools to manage academic departments and structural organization.

Automated Onboarding: Welcome emails sent automatically to new users with their generated credentials via Nodemailer.

👨‍🎓 Student Module

Submission Dashboard: A personalized dashboard tracking the lifecycle of assignments (Draft, Submitted, Approved, Rejected).

Smart Uploads:

Single Upload: Submit individual assignments with metadata.

Bulk Upload: Upload up to 5 files simultaneously to save time, integrated seamlessly with Cloudinary.

Status Tracking: Visual status badges (Draft, Pending, Approved, Rejected) to track progress at a glance.

🛠️ Tech Stack

Backend: Node.js, Express.js

Database: MongoDB, Mongoose ODM

Frontend: EJS (Templating Engine), Custom CSS (Responsive Design)

Storage: Cloudinary (Secure cloud storage for PDF assignments)

Utilities: Nodemailer (Email notifications), Multer (File handling/Memory Storage)

⚙️ Installation & Setup

Follow these steps to get TaskNet running locally:

Clone the repository

git clone [https://github.com/yourusername/TaskNet.git](https://github.com/yourusername/TaskNet.git)
cd TaskNet


Install Dependencies

npm install


Environment Configuration
Create a .env file in the root directory and add the following variables:

# Server Configuration
PORT=3000

# Database Connection
MONGODB_URI=mongodb://localhost:27017/tasknet_db

# Authentication Secret
SECRET_KEY=your_super_secret_jwt_key

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Nodemailer (Email Service - e.g., Gmail App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password


Initialize Admin User (Crucial Step)
Before starting the application, you must run the admin initialization script. This creates the first "Super Admin" account in your database, which is required to log in and create other users.

node public/admin.js


Note: The script will print the Admin email and password to the console. Save these credentials to log in.

Run the Application

# Run in development mode (using nodemon)
npm run dev

# Run in standard mode
node Server.js


Access the App
Open your browser and navigate to http://localhost:3000.

📂 Project Structure

TaskNet/
├── controllers/      # Logic for Admin, Student, and Auth operations
├── models/           # Mongoose schemas (User, Department, Assignment)
├── routes/           # Express routes (adminRoutes, studentRoutes, authRoutes)
├── utils/            # Helpers (Cloudinary, EmailSender, FileUpload)
├── middleware/       # Auth and Role verification middleware
├── Frontend/
│   └── views/        # EJS Templates (Dashboards, Forms, Lists)
├── public/           # Static assets (Images, CSS) and Admin Seed Script
│   └── admin.js      # Script to create the initial Super Admin
├── .env              # Environment variables (Not committed)
└── Server.js         # Application entry point


🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

📄 License

This project is open-source and available under the MIT License.

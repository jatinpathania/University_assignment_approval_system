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

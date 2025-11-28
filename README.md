University Assignment Approval System 🎓

A robust, role-based web application designed to streamline the assignment submission and approval process within a university. Built with Node.js and MongoDB, it features secure authentication, role-specific dashboards, and cloud-based file management.

🚀 Key Features

🔐 Authentication & Security

Role-Based Access Control (RBAC): Distinct workflows for Admins, HODs, Professors, and Students.

Secure Login: JWT-based session management using HTTP-only cookies.

Data Protection: Password hashing using bcryptjs.

👨‍💼 Admin Module

Dashboard Overview: Real-time statistics on users and departments.

User Management: Create, Edit, Delete, and Search users with Role assignment.

Department Management: Manage academic departments with validation.

Automated Emails: Welcome emails sent to new users with credentials via Nodemailer.

👨‍🎓 Student Module

Submission Dashboard: Track status of assignments (Draft, Submitted, Approved, Rejected).

Cloud Uploads: Single and Bulk (up to 5) file uploads integrated with Cloudinary.

Status Tracking: Visual badges indicating the review status of assignments.

🛠️ Tech Stack

Backend: Node.js, Express.js

Database: MongoDB, Mongoose ODM

Frontend: EJS (Templating Engine), Custom CSS

Storage: Cloudinary (File storage for PDFs)

Utilities: Nodemailer (Email service), Multer (File handling)

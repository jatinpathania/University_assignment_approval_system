# TaskNet 🎓: Robust University Assignment Management System

TaskNet is a comprehensive, role-based web application designed to streamline the assignment submission and approval process within educational institutions. Built with Node.js, Express, MongoDB, and EJS, it features secure authentication, role-specific dashboards, and integrated cloud-based file management with Cloudinary.

## 🚀 Key Features

### 🔐 Authentication & Security
- **Role-Based Access Control (RBAC)**: Distinct workflows and permissions for Admins, HODs, Professors, and Students
- **Secure Login**: JWT-based session management using HTTP-only cookies
- **Data Protection**: Password hashing using bcryptjs for enhanced security

### 👨‍💼 Admin Module
- **Dashboard Overview**: Real-time statistics on total users, departments, and active roles
- **User Management**: Full CRUD capabilities (Create, Read, Update, Delete) for users with role assignment
- **Department Management**: Tools to manage academic departments and organizational structure
- **Bulk Operations**: Import multiple users via CSV for efficient administration
- **Automated Onboarding**: Welcome emails sent automatically to new users with generated credentials

### 👨‍🏫 Professor/HOD Module
- **Assignment Review Dashboard**: Dedicated interface to view and manage assignments pending review
- **Assignment Approval Workflow**: Ability to Approve or Reject submissions with optional feedback
- **Email Notifications**: Students are notified instantly upon assignment approval or rejection
- **Internal Forwarding**: Forward assignments to colleagues for review with email notifications
- **Profile Management**: Edit profile information including contact details and department

### 👨‍🎓 Student Module
- **Submission Dashboard**: Personalized dashboard tracking assignment lifecycle (Draft, Submitted, Pending, Approved, Rejected)
- **Smart Uploads**:
  - Single Upload: Submit individual assignments with metadata
  - Bulk Upload: Upload multiple files (up to 5) simultaneously via Cloudinary
- **Status Tracking**: Visual status badges for quick progress monitoring
- **Profile Management**: Edit personal information and account settings
- **Assignment Details**: View comprehensive assignment information including approval history and reviewer feedback

### 📱 Mobile Responsive Design
- Fully responsive interfaces for all screen sizes (mobile, tablet, desktop)
- Optimized layouts for seamless experience across devices
- Touch-friendly navigation and controls

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Backend** | Node.js, Express.js | Server-side runtime and web framework |
| **Database** | MongoDB, Mongoose ODM | NoSQL database and Object Data Modeling |
| **Frontend** | EJS, Custom CSS | Templating engine and responsive styling |
| **Storage** | Cloudinary | Secure cloud storage for PDF assignments |
| **Email** | Nodemailer | Email notifications for onboarding and updates |
| **File Handling** | Multer | Middleware for file uploads |
| **Authentication** | JWT, bcryptjs | Secure token-based authentication |

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/jatinpathania/University_assignment_approval_system.git
cd University_assignment_approval_system
```

### 2. Install Dependencies
```bash
cd TaskNet/Backend
npm install
```

### 3. Environment Configuration
Create a `.env` file in the Backend directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Connection
MONGODB_URI=mongodb://localhost:27017/tasknet_db

# Authentication Secret
SECRET_KEY=your_super_secret_jwt_key_here

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Nodemailer (Email Service)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_PORT=587
```

**Note**: For Gmail, generate an [App Password](https://myaccount.google.com/apppasswords) due to Google's security policies.

### 4. Initialize Admin User (Required)
Before starting the application, run the admin initialization script to create the first "Super Admin" account:

```bash
node public/admin.js
```

Save the displayed Admin email and password for initial login.

### 5. Run the Application

**Development Mode** (with live reload):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

### 6. Access the Application
Open your browser and navigate to: **http://localhost:3000**

## 📂 Project Structure

```
TaskNet/
├── Backend/
│   ├── controllers/           # Business logic for all modules
│   │   ├── adminController.js
│   │   ├── professorController.js
│   │   ├── studentController.js
│   │   └── authController.js
│   ├── models/                # MongoDB schemas
│   │   ├── user.js
│   │   ├── assignment.js
│   │   ├── department.js
│   │   └── departmentQueries.js
│   ├── routes/                # Express route definitions
│   │   ├── adminRoutes.js
│   │   ├── professorRoutes.js
│   │   ├── studentRoutes.js
│   │   └── authRoutes.js
│   ├── middleware/            # Authentication & authorization
│   │   └── auth.js
│   ├── config/                # Configuration files
│   │   ├── cloudinary.js      # Cloudinary setup
│   │   └── multer.js          # File upload configuration
│   ├── util/                  # Utility functions
│   │   ├── emailSender.js     # Nodemailer setup
│   │   └── cookies.js
│   ├── Token/
│   │   └── jwt.js             # JWT token management
│   ├── db/
│   │   └── db.js              # MongoDB connection
│   ├── public/
│   │   └── admin.js           # Admin user initialization script
│   ├── server.js              # Application entry point
│   ├── package.json
│   └── .env                   # Environment variables (not committed)
│
├── Frontend/
│   ├── views/                 # EJS templates
│   │   ├── landingPage.ejs
│   │   ├── login.ejs
│   │   ├── adminDashboard.ejs
│   │   ├── professorDashboard.ejs
│   │   ├── studentDashboard.ejs
│   │   ├── myAssignments.ejs
│   │   ├── uploadAssignment.ejs
│   │   ├── reviewAssignment.ejs
│   │   ├── assignmentDetails.ejs
│   │   └── ...
│   ├── public/                # Static assets
│   └── package.json
│
└── README.md
```

## 🔄 User Workflows

### Admin Workflow
1. Login with admin credentials
2. Manage users, departments, and roles
3. Monitor system activity and statistics
4. Create bulk users via CSV import

### Professor Workflow
1. Login to professor portal
2. View assignments pending review on dashboard
3. Review and approve/reject submissions
4. Forward assignments to colleagues if needed
5. Manage profile information
6. View detailed assignment histories

### Student Workflow
1. Login to student portal
2. View dashboard with assignment statistics
3. Upload single or multiple assignments
4. Track assignment status in real-time
5. View detailed feedback and approval history
6. Manage profile information

## 🔐 Security Features

- **Password Security**: Bcryptjs hashing with salt rounds
- **JWT Authentication**: HTTP-only cookies prevent XSS attacks
- **Role-Based Authorization**: Middleware validates user permissions
- **File Validation**: Server-side validation for uploaded files
- **SQL Injection Prevention**: MongoDB + Mongoose prevent injection attacks
- **CORS Configuration**: Secure cross-origin requests

## 📧 Email Notifications

TaskNet sends automated emails for:
- User onboarding with generated credentials
- Assignment submission confirmations
- Approval notifications
- Rejection notifications with feedback
- Assignment forwarding alerts

## 🎨 UI/UX Features

- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Intuitive Navigation**: Easy-to-use interface for all user roles
- **Real-time Updates**: Live status tracking for assignments
- **Visual Feedback**: Status badges, notifications, and confirmations
- **Accessible Forms**: Properly labeled inputs and validation messages
- **Dark/Light Compatibility**: Works across different system themes

## 🐛 Known Limitations

- File uploads limited to PDF format (configurable)
- Bulk upload limited to 5 files per submission
- MongoDB local instance required for development

## 🚀 Future Enhancements

- [ ] Mobile app using React Native
- [ ] Advanced analytics and reporting
- [ ] Integration with university information systems
- [ ] Real-time notifications using WebSockets
- [ ] Assignment plagiarism detection
- [ ] Scheduled email reminders
- [ ] API documentation with Swagger

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open-source and available under the MIT License. See the LICENSE file for details.

## 👨‍💻 Author

**Jatin Pathania**
- GitHub: [@jatinpathania](https://github.com/jatinpathania)
- Project: [University Assignment Approval System](https://github.com/jatinpathania/University_assignment_approval_system)

## 📞 Support

For support, issues, or feature requests, please open an issue on the [GitHub repository](https://github.com/jatinpathania/University_assignment_approval_system/issues).

## 🙏 Acknowledgments

- Express.js community for excellent documentation
- MongoDB for flexible data storage
- Cloudinary for reliable file hosting
- All contributors and testers

---

**Made with ❤️ by Jatin Pathania**
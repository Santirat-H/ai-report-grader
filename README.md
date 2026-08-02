
# AI Report Grader (Research Prototype)

> A proof-of-concept web application developed to demonstrate AI-assisted report grading and evaluation for research presentation purposes.

This project serves as a demonstration prototype for a research study. It provides a foundational pipeline for uploading PDF reports, initiating an AI evaluation process, and offering an interface for human review and verification.

### Disclaimer
This repository currently holds the prototype version used for the research demonstration. The backend architecture and code organization are in an experimental state. There are ongoing plans to refactor the codebase and set up a streamlined deployment pipeline in the near future.

### Tech Stack

**Frontend**
-   Framework: Next.js (App Router)
-   Language: TypeScript
-   Styling: Tailwind CSS
-   UI Components: shadcn/ui

**Backend**
-   Framework: NestJS
-   Database ORM: Prisma
-   Storage: File system storage for PDF reportsฃ

### Key Features
1.  Document Management
    -   Upload and securely store PDF reports.
    -   Centralized file listing and management interface.
2.  AI Evaluation Interface
    -   Dashboard to trigger and monitor the AI grading process.
    -   Prototype integration for report analysis.
3.  Human-in-the-Loop Review
    -   Dedicated interface for human evaluators to review AI-generated scores, ensuring accuracy and fairness.

### Project Structure
```bash
.
├── backend/             # NestJS API handling uploads and database interactions
│   ├── prisma/          # Database schema
│   ├── src/             # Core logic (Files, Storage, Users)
│   └── uploads/         # Temporary local storage for PDFs
├── frontend/            # Next.js user interface
│   ├── app/             # Application routes (Dashboard, Evaluate, Human Review, List)
│   └── components/      # Reusable UI components (PDF Uploader, File Cards)
└── docker-compose.yml   # Future deployment configuration
```

### Getting Started

**1. Clone the repository**
```bash
git clone [your-repository-url]
cd ai-report-grader
```

**2. Backend Setup**
```
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

**3. Frontend Setup**
```
cd ../frontend
npm install
npm run dev
```

### Future Roadmap
-   [ ] Codebase refactoring and technical debt reduction.
-   [ ] Implement a robust cloud storage solution (e.g., AWS S3 or MinIO) replacing local upload folders.
-   [ ] Establish a simple CI/CD pipeline for cloud deployment.
-   [ ] Integrate full end-to-end AI processing workflows.

### Deployment

The Next.js frontend can be deployed to Vercel while the NestJS API, Supabase
PostgreSQL database, and Supabase Storage remain external. See
[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for the required settings,
environment variables, known limitations, first-deployment checklist, and DNS
cutover plan. The Docker and DigitalOcean configuration is intentionally retained
as a fallback deployment path.

# Portfolio Hacker Studio - Education Management System

## 📋 System Analysis & Documentation

> ⚠️ **IMPORTANT:** This project has undergone a comprehensive system analysis. Please review the documentation before making changes.

### 📚 Complete Documentation Suite:

| Document | Purpose | Audience | Priority |
|----------|---------|----------|----------|
| **[📖 DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** | Start here - Overview of all documents | Everyone | ⭐⭐⭐⭐⭐ |
| **[🎯 EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)** | High-level overview with ROI | Executives, Managers | ⭐⭐⭐⭐⭐ |
| **[📊 SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md)** | Complete technical analysis | Tech Leads, Architects | ⭐⭐⭐⭐⭐ |
| **[⚡ ISSUES_SUMMARY.md](./ISSUES_SUMMARY.md)** | Quick reference of all issues | All Team Members | ⭐⭐⭐⭐⭐ |
| **[🔧 BUG_FIXES_EXAMPLES.md](./BUG_FIXES_EXAMPLES.md)** | Code examples and fixes | Developers | ⭐⭐⭐⭐ |
| **[✅ IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** | 8-week implementation plan | Dev Team, PMs | ⭐⭐⭐⭐ |
| **[🔐 ROLE_MIGRATION_GUIDE.md](./ROLE_MIGRATION_GUIDE.md)** | Fix role authorization | Developers | ⭐⭐⭐⭐⭐ |
| **[📄 README_PAGINATION_ENHANCEMENTS.md](./README_PAGINATION_ENHANCEMENTS.md)** | Pagination status | Developers | ⭐⭐⭐ |

### 🚨 Critical Issues (Fix Immediately):
1. **30+ files** need role migration - [ROLE_MIGRATION_GUIDE.md](./ROLE_MIGRATION_GUIDE.md)
2. **Security vulnerabilities** in token storage - [SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md#2-security-vulnerabilities)
3. **100+ console.log** statements in production - [BUG_FIXES_EXAMPLES.md](./BUG_FIXES_EXAMPLES.md#2-security-bug---exposed-tokens)
4. **No error boundaries** - App crashes not handled
5. **Incomplete pagination** - Performance issues with large data

**📊 Progress:** 0% Critical Issues | 27% Pagination | 100% Documentation

---

## Project info

**URL**: https://lovable.dev/projects/fbb3022f-10d9-4feb-9442-6a1994e19ee4

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fbb3022f-10d9-4feb-9442-6a1994e19ee4) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fbb3022f-10d9-4feb-9442-6a1994e19ee4) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

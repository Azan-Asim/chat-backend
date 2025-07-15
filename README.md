# Chat Project

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v22.17.0**
- [pnpm](https://pnpm.io/) package manager
- MySQL database server

### Setup

1. **Clone the repository:**

```bash
git clone <your-repo-url>
cd <your-project-directory>
```

2. **Install dependencies using pnpm:**

```bash
pnpm install
```

3. **Set up the database:**

Make sure you have MySQL running and create a database named `chat`:

```sql
CREATE DATABASE chat;
```

4. **Create environment variables:**

Create a `.env` file in the project root and add the following:

```
JWT_SECRET=your_jwt_secret_here
```

### Running the Project

To start the development server:

```bash
pnpm run dev
```

---

### Author

**Muhammad Arslan**  
📧 marslanmustafa391@gmail.com
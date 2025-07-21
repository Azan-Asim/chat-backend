# Chat Project

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v22.17.0**
- [pnpm](https://pnpm.io/) package manager
- MySQL database server / phpMyAdmin:Xampp

### Setup

1. **Clone the repository:**

```bash
git clone https://github.com/devsinntechnologies/chat-backend.git
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
pnpm start:dev
```

## Sequelize Migrations

#### Create new sequelize migrations

````
 npx sequelize-cli migration:generate --name <any-name>
````

### run sequelize migrations

````
npx sequelize-cli db:migrate
````
---

## ✍️ Author

**Muhammad Arslan**  
📧 [marslanmustafa391@gmail.com](mailto:marslanmustafa391@gmail.com)  
🌐 [https://marslanmustafa.com](https://marslanmustafa.com)

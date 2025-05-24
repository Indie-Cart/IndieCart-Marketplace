# 🚀 IndieCart ![GitHub last commit](https://img.shields.io/github/last-commit/Indie-Cart/IndieCart-Marketplace?style=flat-square) ![GitHub issues](https://img.shields.io/github/issues/Indie-Cart/IndieCart-Marketplace?style=flat-square) ![Coverage](https://img.shields.io/badge/coverage-80.29%25-brightgreen?style=flat-square)

IndieCart is a local artisan marketplace built to empower independent artists and DIY creators. We provide a platform where sellers can showcase their handmade products, and buyers can discover unique, one-of-a-kind items. Our mission is to support creativity, promote small businesses, and build a vibrant community around handcrafted goods.


## 💻 Tech Stack

| Frontend     | Backend     | Database    | Testing | CI/CD         |
|--------------|-------------|-------------|---------|----------------|
| React + Vite | Express.js  | PostgreSQL  | Jest    | GitHub Actions |

## 🛠️ Installation

### 🧰 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)

### ⚙️ Setup Instructions
1. Clone the repository
```bash
git clone https://github.com/Indie-Cart/IndieCart-Marketplace.git
```
2. Install Backend Dependencies
```bash
cd Backend
npm install
```
3. Install Frontend Dependencies
```bash
cd ../Frontend
npm install
npm run build
```

3. Start the Application on [http://localhost:8080/](http://localhost:8080/)
```bash
cd ..
npm start 
```

## 💳 Test Payments & Admin Access

### 💰 Test Card Numbers (Stripe)

| Status  | Card Number           | Expiry           | CVC  |
|---------|------------------------|------------------|------|
| Success | 4242 4242 4242 4242   | Any future date  | Any  |
| Failure | 4000 0000 0000 0002   | Any future date  | Any  |

### 👮 Admin Credentials

- **Email:** `indiecartadmin@gmail.com`  
- **Password:** `Admin@123`

## 🧪 Testing ![Code Coverage](https://img.shields.io/badge/coverage-80.29%25-brightgreen)
- Backend tests implemented using Jest
- Automated test runs on push and pull requests to main
- Go to Github actions, Node.js CI, Choost last test, test (18.x), expand "run tests" scroll down to see coverage

## 🌐 Deployed Site

Try it out: [https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net/](https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net/)

## 🤝 Contributing

- Indie Cart 

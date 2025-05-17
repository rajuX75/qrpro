# 🎯 QR Code Generation API

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-000000?style=for-the-badge&logo=drizzle&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

</div>

A modern, scalable QR code generation API built with cutting-edge technologies. This API provides enterprise-grade features for generating, customizing, and managing QR codes with support for both static and dynamic content.

## ✨ Features

### 🎨 Static QR Codes
- **Advanced Customization**
  - Multiple format support (PNG, JPEG, SVG, WebP)
  - Custom colors with alpha channel support
  - Adjustable error correction levels
  - Logo embedding with transparency
  - Custom styling and branding options

### 🔄 Dynamic QR Codes
- **Real-time Analytics**
  - Live scan tracking
  - Geographic distribution
  - Device and browser analytics
  - Custom event tracking
  - A/B testing support

### 📦 Bulk Generation
- **Enterprise Features**
  - Parallel processing
  - Progress tracking
  - Custom naming conventions
  - Batch operations
  - Export in multiple formats

### 🔐 API Management
- **Security & Monitoring**
  - JWT-based authentication
  - Role-based access control
  - Usage analytics dashboard
  - Rate limiting with Redis
  - Audit logging

## 🛠 Tech Stack

- **Runtime**: Node.js 18+ (LTS)
- **Language**: TypeScript 5.0+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 14+ with TimescaleDB
- **ORM**: Drizzle ORM
- **Caching**: Redis
- **Queue**: Bull
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI
- **Monitoring**: Prometheus, Grafana
- **CI/CD**: GitHub Actions
- **Container**: Docker

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS)
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/qrpro.git
cd qrpro

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec api npm run db:push
```

## 📚 API Documentation

### Authentication

```bash
# Get your API key
curl -X POST http://localhost:3000/api/v1/apikey
```

### Example Usage

```typescript
// Generate a QR code
const response = await fetch('http://localhost:3000/api/v1/qr/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    data: 'https://example.com',
    size: 300,
    format: 'png',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  })
});
```

For detailed API documentation, visit `/docs` when the server is running.

## 🏗 Project Structure

```
qrpro/
├── src/
│   ├── routes/          # API route handlers
│   ├── controllers/     # Business logic
│   ├── services/        # Core services
│   ├── db/             # Database schema and migrations
│   ├── utils/          # Utility functions
│   ├── middleware/     # Express middleware
│   ├── types/          # TypeScript type definitions
│   ├── config/         # Configuration files
│   └── app.ts          # Express application setup
├── tests/              # Test files
├── docs/               # Documentation
├── scripts/            # Build and deployment scripts
└── docker/             # Docker configuration
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## 📈 Monitoring

- **Metrics**: Prometheus
- **Visualization**: Grafana
- **Logging**: Winston
- **Tracing**: OpenTelemetry
- **Error Tracking**: Sentry

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Run tests
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- 📧 Email: support@qrpro.com
- 💻 GitHub Issues: [Create an issue](https://github.com/yourusername/qrpro/issues)
- 💬 Discord: [Join our community](https://discord.gg/qrpro)

## 🙏 Acknowledgments

- [QRCode.js](https://github.com/davidshimjs/qrcodejs) for QR code generation
- [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) for database operations
- [Express.js](https://expressjs.com/) for the web framework
- [TypeScript](https://www.typescriptlang.org/) for type safety

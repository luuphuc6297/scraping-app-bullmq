<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

# Web Scraping Service with BullMQ

A robust web scraping service built with NestJS, featuring queue processing, monitoring, and scalability.

## 🚀 Features

- Dual scraping strategies (Cheerio and Puppeteer)
- Queue management with BullMQ
- Resource monitoring
- Metrics collection with Prometheus
- Visualization with Grafana
- Database persistence with PostgreSQL
- Caching with Redis
- Docker containerization
- Health checks and monitoring
- URL validation and analysis
- Duplicate detection
- Error handling and retries
- Transaction management

## 📋 Tech Stack

### Core
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [TypeScript](https://www.typescriptlang.org/) - JavaScript with syntax for types
- [Node.js](https://nodejs.org/) - JavaScript runtime

### Scraping
- [Cheerio](https://cheerio.js.org/) - Fast, flexible implementation of jQuery for server-side scraping
- [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API for dynamic content scraping

### Queue Management
- [BullMQ](https://docs.bullmq.io/) - Queue management system
- [Bull Board](https://github.com/felixmosh/bull-board) - Queue monitoring UI

### Database
- [PostgreSQL](https://www.postgresql.org/) - Primary database
- [TypeORM](https://typeorm.io/) - ORM for database operations
- [PgAdmin](https://www.pgadmin.org/) - PostgreSQL administration

### Caching & Queue
- [Redis](https://redis.io/) - In-memory data store

### Monitoring
- [Prometheus](https://prometheus.io/) - Metrics collection
- [Grafana](https://grafana.com/) - Metrics visualization
- Custom resource monitoring

## 🛠 Installation

### Prerequisites
- Node.js (v18 or later)
- Docker and Docker Compose
- pnpm (recommended) or npm

### Using Docker Compose (Recommended)

1. Clone the repository:

2. Create `.env` file with required environment variables:

3. Start the services:
- bash
- docker-compose up -d

### Local Development

1. Install dependencies:


2. Start required services (PostgreSQL, Redis):


3. Start the application:

- bash
- pnpm start:dev
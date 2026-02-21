# DreamDev Hackathon 2025 – Merchant Analytics API

**Author:** Banjo Oluwafikayomi Zainab

---

## Overview

REST API analyzing merchant activity data from CSVs.

- **Node.js + Express**
- **PostgreSQL** database
- Handles multiple CSVs and invalid/empty values automatically
- Runs on **port 8080**

---

## Endpoints

| Endpoint                              | Description                        |
| ------------------------------------- | ---------------------------------- |
| `/analytics/top-merchant`             | Merchant with highest total volume |
| `/analytics/monthly-active-merchants` | Unique merchants per month         |
| `/analytics/product-adoption`         | Unique merchants per product       |
| `/analytics/kyc-funnel`               | KYC conversion funnel              |
| `/analytics/failure-rates`            | Failure rate by product            |

---

## Setup

1. Clone repo & install dependencies:

```bash
git clone <repo-url>
cd dreamdev-hackathon
npm install
```

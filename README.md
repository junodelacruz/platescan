<div align="center">

![icon](src/assets/images/icon.png)

# Platescan

</div>

Platescan is a personal calorie tracking and nutritional app. Take a picture of a plate of food, and receive an AI estimated breakdown of the calories and macros. Log plates, track weight, and view progress!

**NOTE: Platescan is currently single-user only! Expansion to multi-user support is unknown.**

---

<div align="center">

<img width="600" height="460" alt="demo1" src="https://github.com/user-attachments/assets/01fa9c60-7bb9-4a1d-ad64-4088f0c2bdf5" />

**Login → Scan → Edit**

</div>

---

## Overview

Tracking calories is tedious. I used to send images of my food into an LLM to track calories, amd most other applications are paid and locked behind a monthly subscription. I realized I can engineer my own version, so I created Platescan as a personal free alternative.

Platescan is fully developed and hosted in my room. I wanted to experience creating and hosting everything from frontend to backend myself, without relying on external services.

### Author

Juno Dela Cruz

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/juno-dela-cruz/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/junodelacruz)

## Additional Features

<div align="center">

<img width="600" height="460" alt="demo2" src="https://github.com/user-attachments/assets/fa1c83cc-55a0-451b-8e45-f8b384d4134e" />

**Scanning with context**

---

<img width="600" height="460" alt="demo3" src="https://github.com/user-attachments/assets/fb6b6ec9-d919-417b-a7b8-a319dce1376b" />

**Calendar**

---

<img width="600" height="460" alt="demo4" src="https://github.com/user-attachments/assets/c30ecae3-15e8-4f45-99a0-9f44567f4458" />

**Weight Tracker**

---

</div>

## Tech Stack

- **Frontend:** Expo, React Native Web (installable PWA)
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **AI:** Google Gemini API, proxied through the backend
- **Image processing:** sharp (resizes uploads to WebP with thumbnails)
- **Auth:** JWT, single-user
- **Deployment:** Docker Compose on a home server, NGINX Proxy Manager, DuckDNS

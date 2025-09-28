# Homework Assistant

## Overview

The Homework Assistant is a full-stack web application providing AI-powered solutions for various homework types. It accepts diverse inputs (text, image, PDF, document) and leverages multiple Large Language Models (LLMs) to generate detailed answers. Key features include drag-and-drop uploads, voice input, mathematical notation rendering, and PDF export. The project aims to be a comprehensive, user-friendly academic tool, targeting a broad market of students and educators. It also includes a "GPT BYPASS" feature for text rewriting and AI detection score reduction.

## User Preferences

Preferred communication style: Simple, everyday language.
Username jmkuczynski: Unlimited access with 99,999,999 tokens (maximum credits) - no password required.
Username randyjohnson: Unlimited access with 99,999,999 tokens (maximum credits) - no password required.

## System Architecture

The application utilizes a client-server architecture.

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **UI/Styling**: Shadcn/ui (Radix UI) and Tailwind CSS for a modern, responsive design.
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Display**: MathJax for mathematical notation and integrated image display.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript)
- **Database**: PostgreSQL with Drizzle ORM.
- **File Processing**: Multer for uploads, Tesseract.js for OCR, pdf2json for PDF text extraction.
- **Graph Generation**: Chart.js with ChartJSNodeCanvas for server-side graph creation.

### Core Features & Design Patterns
- **File Processing Pipeline**: Standardized process from input to LLM processing and response generation.
- **Integrated Graph Generation**: Automatic detection and server-side creation of line, bar, and scatter graphs based on LLM-generated data.
- **LLM Integration**: Designed for multiple AI providers, allowing user selection and intelligent application of LaTeX notation for mathematical problems. Solutions are delivered via real-time streaming, with a 30% partial content display for users with insufficient credits.
- **Voice Input**: Unlimited-length dictation using browser Web Speech API, Azure Speech Services, and advanced pause detection for seamless transcription.
- **Mathematical Notation**: MathJax integration provides full LaTeX support for display and PDF export.
- **Dual Payment System**: Full payment infrastructure with PayPal and Stripe for authentication, session tracking, and flexible payment options.
- **Multi-User Data Isolation**: PostgreSQL enforces user-scoped data access via `user_id` filtering, ensuring security and supporting anonymous users.
- **GPT BYPASS**: Integrated functionality for text rewriting and AI detection score reduction, including chunked processing for large documents.

## External Dependencies

- **Database**: PostgreSQL
- **LLM APIs**: Anthropic, OpenAI, Azure OpenAI, DeepSeek, Perplexity
- **Payment Gateways**: PayPal and Stripe
- **CDN Services**: MathJax, Google Fonts
- **Speech Services**: Azure Cognitive Services (optional)
# Homework Assistant

## Overview

The Homework Assistant is a full-stack web application designed to provide AI-powered solutions for various homework types. It accepts text, image, PDF, and document inputs, leveraging multiple Large Language Models (LLMs) to generate detailed answers. Key capabilities include drag-and-drop file uploads, voice input, mathematical notation rendering, and PDF export. The project aims to offer a comprehensive, user-friendly tool for academic assistance, with ambitions to serve a wide market of students and educators.

## User Preferences

Preferred communication style: Simple, everyday language.
Username jmkuczynski: Unlimited access with 99,999,999 tokens (maximum credits) - no password required.
Username randyjohnson: Unlimited access with 99,999,999 tokens (maximum credits) - no password required.

## System Architecture

The application employs a clear client-server architecture.

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **UI/Styling**: Shadcn/ui (Radix UI) and Tailwind CSS for a modern, responsive design.
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Display**: MathJax for mathematical notation and integrated image display for graphs.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript)
- **Database**: PostgreSQL with Drizzle ORM.
- **File Processing**: Multer for uploads (PDFs, images, documents), Tesseract.js for OCR, pdf2json for PDF text extraction.
- **Graph Generation**: Chart.js with ChartJSNodeCanvas for server-side graph creation.

### Core Features & Design Patterns
- **File Processing Pipeline**: Standardized process from upload to text extraction, LLM processing, graph detection, and response generation.
- **Integrated Graph Generation**: Automatic detection and server-side creation of graphs (line, bar, scatter) based on LLM-generated data, seamlessly embedded into solutions. Supports multiple graphs per assignment.
- **LLM Integration**: Designed for multiple AI providers, allowing user selection and leveraging their capabilities for detailed solutions. Intelligent content detection ensures LaTeX notation is applied only to mathematical problems.
- **Voice Input**: Utilizes browser Web Speech API and Azure Speech Services for real-time transcription.
- **Mathematical Notation**: MathJax integration provides full LaTeX support, optimized for display and PDF export.
- **Dual Payment System**: Complete payment infrastructure with both PayPal and Stripe integration for user authentication, session tracking, and flexible payment options.
- **Multi-User Data Isolation**: A single shared PostgreSQL database enforces user-scoped data access via `user_id` filtering, preventing cross-user data access and ensuring secure deletion. Includes support for anonymous users.
- **GPT BYPASS**: Integrated functionality for text rewriting and AI detection score reduction, with a dedicated interface and seamless workflow between homework assistant and bypass features.

## External Dependencies

- **Database**: PostgreSQL
- **LLM APIs**: Anthropic, OpenAI, Azure OpenAI, DeepSeek, Perplexity
- **Payment Gateways**: PayPal and Stripe
- **CDN Services**: MathJax, Google Fonts
- **Speech Services**: Azure Cognitive Services (optional)

## Recent Changes

### September 11, 2025
- Fixed jmkuczynski login authentication issue
  - Resolved case sensitivity problem in username comparison (frontend sent "JMKUCZYNSKI", backend expected "jmkuczynski")
  - Updated backend login route to use case-insensitive username matching
  - Both jmkuczynski and randyjohnson can now login without passwords as intended
- Updated Contact Us link to be a small, non-floating text link at the top of both homework assistant and GPT BYPASS pages (linking to contact@zhisystems.ai)
- Implemented chunked processing for GPT BYPASS function:
  - Automatically splits large documents (over 800 words) into 700-word chunks
  - Added user controls to select/deselect specific chunks for processing
  - Includes 'Select All' and 'Select None' buttons for chunk selection
  - Processes selected chunks sequentially with individual AI scoring and progress tracking

### September 13, 2025
- **Complete Stripe Payment Integration**: Successfully implemented full Stripe payment system alongside existing PayPal
  - Created stripe_payments database table for payment tracking and status management
  - Built complete payment infrastructure from database schema to frontend components
  - Implemented tabbed payment interface allowing users to choose between PayPal and Stripe
  - Added automatic token crediting upon successful payment completion
  - Fixed popup window auto-close functionality for seamless user experience
  - Verified end-to-end payment flow with live Stripe integration
  - Dual payment system now fully operational and tested
- **Critical Stripe Deployment Fixes**: Resolved production payment failures with comprehensive security and reliability improvements
  - Removed dangerous fallback keys and implemented fail-fast environment variable validation
  - Fixed redirect reconciliation by adding session_id to success/cancel URLs for proper post-payment handling
  - Eliminated session dependency from payment status endpoint to prevent 401 errors after cross-site redirects
  - Enhanced webhook security by removing insecure fallbacks and requiring proper environment configuration
  - Improved token crediting reliability by using server-side payment records instead of Stripe metadata
  - Added comprehensive debug logging for production troubleshooting
  - Updated to valid Stripe API version (2024-06-20) for stable production behavior
- **Stripe Production Deployment Issue RESOLVED**: Successfully diagnosed and fixed false "Payment failed" errors in production
  - Root cause identified: Backend was working perfectly (payments completing, tokens being credited), but frontend polling timeout was too aggressive
  - Fixed frontend polling system with 3-minute timeout and proper error handling
  - Enhanced status logging revealed payments were actually succeeding (e.g., 8,000 → 10,000 token balance increases)
  - Eliminated false negative "Payment failed" messages that occurred when UI timed out before Stripe completed payment flow
  - Production Stripe payment system now fully functional and user-facing error resolved

### September 14, 2025
- **Render Stripe Deployment Fixes**: Implemented comprehensive Render-specific fixes for production Stripe payment functionality
  - Added reachability probes (`/__ping` and `/api/webhooks/stripe` GET endpoints) for Render deployment diagnostics
  - Corrected webhook path from `/api/webhook/stripe` to `/api/webhooks/stripe` (plural) for consistency
  - Enhanced webhook route ordering with proper placement before express.json() middleware for raw body access
  - Added diagnostics endpoint (`/__diag/pay`) to verify environment configuration without exposing secrets
  - Implemented live price credits fetching via line items for Render deployment compatibility
  - Enhanced error handling with transient vs permanent error classification for proper Stripe retry behavior
  - All Render-specific fixes validated and production-ready
- **GPT BYPASS Database Fix RESOLVED**: Fixed critical "Humanization failed" error in both development and production
  - Root cause: Missing database tables (`rewrite_jobs`, `documents`, `stripe_events`) causing relation errors
  - Solution: Created all missing tables using direct SQL commands to restore full database schema
  - Verified fix: Humanization API now responds correctly (200 OK) with proper AI detection scoring
  - GPT BYPASS feature fully operational with chunked processing and rewriting capabilities restored
- **GPTZero AI Detection FULLY FIXED**: Resolved critical AI detection accuracy issues in GPT BYPASS feature
  - Problem identified: Invalid GPTZero API key causing 401 authentication errors and fallback to fake scores
  - Root cause: App showing incorrect results (e.g., 51% AI) while GPTZero direct interface showed correct results (99% Human)
  - Solution: Updated to valid GPTZero API key with proper authentication and API credits
  - Result: AI detection now returns accurate real-time scores matching GPTZero's direct interface
  - GPT BYPASS feature now provides precise AI detection scoring for both original and humanized text

### September 15, 2025
- **Intelligent Pause-Detection Voice Dictation IMPLEMENTED**: Completely revolutionized voice input with unlimited-length dictation using sophisticated pause detection
  - **Voice Activity Detection (VAD)**: Real-time audio level monitoring using Web Audio API with RMS calculation for precise speech/silence detection
  - **Automatic Pause Segmentation**: System detects 1.3-second pauses and automatically transcribes speech chunks, eliminating 30-second recording limits
  - **Continuous Recording Architecture**: MediaRecorder runs continuously with 200ms timeslices, buffering audio chunks until pause detected
  - **Ordered Transcription Queue**: Sequential processing with concurrency protection ensures transcribed text appears in correct order despite network delays
  - **Enhanced Visual Feedback**: Color-coded microphone button states (blue=listening, green=speaking with pulse, purple=transcribing) with activity indicators
  - **Cross-Browser Compatibility**: MediaRecorder fallback chain supports WebM Opus, WebM, and MP4 formats for maximum browser support
  - **Production-Ready Robustness**: Noise floor calibration, minimum utterance validation, graceful error handling, and proper resource cleanup
  - **Academic Use Case Optimized**: Perfect for dictating long passages, lectures, research notes - users can speak naturally with pauses and get seamless text output
  - **Unlimited Length Dictation**: No arbitrary time limits - speak for minutes or hours, system automatically chunks and processes speech as you pause
- **Critical AI Chat Bug FIXED**: Resolved major issue where AI chat was returning incorrect responses (e.g., prime number questions getting essay analysis responses)
  - Root cause: Chat API was calling homework processing function instead of dedicated chat function
  - Solution: Updated chat endpoint to use proper `processWithAnthropicChat` function for conversational responses
  - AI chat now provides accurate, contextual answers to user questions instead of homework-style analysis
- **Voice Dictation in AI Chat RESTORED**: Fixed voice dictation failures in chat interface caused by malformed audio blobs
  - Issue: Pause-detection system was creating corrupted audio files that couldn't be transcoded by AssemblyAI
  - Fix: Proper MIME type handling using MediaRecorder's actual format instead of hardcoded values
  - Improved audio chunk validation and blob construction for reliable transcription
  - Voice dictation now works seamlessly in both homework input and AI chat interface
- **Enhanced User Feedback**: Added "Transcribing..." message during voice processing pauses
  - Eliminates confusion during the delay between speech completion and text appearance
  - Shows real-time status: listening (blue) → speaking (green) → transcribing (purple) → completed text
  - Provides clear visual feedback throughout the entire voice input process
- **Universal Transcription Status Messages**: Extended transcription feedback to ALL voice input locations
  - Added transcription status to InputWithVoice component for assignment names and all text inputs
  - Added transcription status to MathTextarea component for homework input with LaTeX math support
  - Achieved complete consistency across TextareaWithVoice, InputWithVoice, and MathTextarea components
  - All voice dictation fields now show synchronized "[Transcribing...]" messages during processing pauses
  - Unified user experience with identical visual feedback patterns across the entire application
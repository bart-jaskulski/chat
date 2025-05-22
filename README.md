<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
- SQLite for saving chat history and user data (via `file:./chat.db`)
- AWS S3 for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy this project to any Node.js compatible hosting environment.

**Important Considerations for Deployment:**

*   **SQLite Database:** The application uses a local SQLite file (`chat.db`). Ensure your deployment environment has persistent storage if you want to retain chat history across deployments. For serverless environments, you might need to consider a managed SQLite service or switch to a different database provider.
*   **AWS S3:** You will need to configure your S3 bucket and AWS credentials in the production environment.
*   **Environment Variables:** Ensure all necessary environment variables (see `.env.example`) are set up in your deployment environment.

## Running locally

You will need to set up the environment variables [defined in `.env.example`](.env.example) to run the AI Chatbot. Create a `.env` file in the root of the project and populate it with your credentials.

**Key Environment Variables:**

*   `AUTH_SECRET`: A random secret for Auth.js.
*   `XAI_API_KEY`: Your API key for the xAI models.
*   `DATABASE_URL`: Path to your SQLite database file (e.g., `file:./chat.db`).
*   `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID for S3.
*   `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key for S3.
*   `AWS_REGION`: The AWS region where your S3 bucket is located.
*   `S3_BUCKET_NAME`: The name of your S3 bucket for file uploads.

> Note: You should not commit your `.env` file to version control as it will expose secrets.

**Setup Steps:**

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
    _If you encounter issues with `pnpm`, you can try `npm install --legacy-peer-deps`._

2.  **Set up environment variables:**
    Create a `.env` file by copying `.env.example` and fill in your actual credentials:
    ```bash
    cp .env.example .env
    ```
    Then edit `.env` with your values.

3.  **Run database migrations:**
    This will create the necessary tables in your SQLite database.
    ```bash
    pnpm db:migrate
    ```

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```

Your app template should now be running on [localhost:3000](http://localhost:3000).

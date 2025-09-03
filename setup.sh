#!/bin/bash

echo "🚀 Setting up Notion Clone..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Setup Convex
echo "🔧 Setting up Convex backend..."
echo "   Note: You'll need to create a free account at https://convex.dev"
echo "   and follow the prompts to connect your project."
echo ""

# Check if convex is already configured
if [ ! -f ".env.local" ] || ! grep -q "VITE_CONVEX_URL" .env.local; then
    echo "   Run the following command to set up Convex:"
    echo "   npx convex dev"
    echo ""
    echo "   This will:"
    echo "   - Create a new Convex project"
    echo "   - Generate your database schema"
    echo "   - Provide you with a Convex URL"
    echo ""
else
    echo "✅ Convex configuration found"
fi

echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "1. Set up Convex (if not done): npx convex dev"
echo "2. In another terminal, run: npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📖 For detailed setup instructions, see README.md"
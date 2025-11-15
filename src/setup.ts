/**
 * Global application setup
 * This file is imported first to ensure environment variables are loaded
 */

console.log("🔧 SETUP.TS: Loading environment setup...");

// Load environment variables
import "./lib/env";

// Log environment information for debugging
import { env, isDevelopment, isProduction, isTest } from "./lib/env";

console.log(`🚀 Starting Hackerfolio in ${env.NODE_ENV} environment (process.env.NODE_ENV: ${process.env.NODE_ENV})`);
console.log(`🔍 isTest(): ${isTest()}, isDevelopment(): ${isDevelopment()}, isProduction(): ${isProduction()}`);

if (isDevelopment()) {
  console.log("🔧 Development mode: Using localhost configuration");
} else if (isProduction()) {
  console.log("🌍 Production mode: Using production configuration");
} else if (isTest()) {
  console.log("🧪 Test mode: Using test configuration");
}

import { defineConfig } from 'vite';

export default defineConfig({
  // Root directory for source files
  root: '.',
  
  // Public directory for static assets (served as-is)
  publicDir: 'public',
  
  // Build configuration
  build: {
    // Output directory for production build
    outDir: 'dist',
    
    // Don't empty outDir (allows keeping other files)
    emptyOutDir: true,
    
    // Generate sourcemaps for debugging
    sourcemap: true,
    
    // Rollup options
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  
  // Development server configuration
  server: {
    port: 5173,
    open: true,
    // Handle SPA routing - redirect all requests to index.html
    historyApiFallback: true,
  },
  
  // Preview server configuration (for testing production build)
  preview: {
    port: 4173,
  },
  
  // Resolve configuration
  resolve: {
    // Allow importing without extensions for these
    extensions: ['.js', '.ts', '.json'],
  },
  
  // Environment variable prefix (default is VITE_)
  envPrefix: 'VITE_',
});

"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Manager Panel Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-gray-100">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Panel Error</h1>
        <p className="text-gray-500 mb-10 leading-relaxed">
          We've encountered an issue while loading this page. Please try refreshing or returning to the dashboard.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => reset()}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-100"
          >
            Attempt Recovery
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-50 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-100 transition-all border border-gray-200"
          >
            Reload Page
          </button>
        </div>
        
        <div className="mt-10 pt-8 border-t border-gray-50 text-xs text-gray-400">
          Ref ID: {error.digest || 'Internal Error'}
        </div>
      </div>
    </div>
  );
}

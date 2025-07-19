import { NEST_API_URL } from "./index.js";

// Helper function to make API calls
export async function apiCall(endpoint: string, options?: any): Promise<any> {
  const url = `${NEST_API_URL}${endpoint}`;
  const method = options?.method || 'GET';
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
}

// Helper function for authenticated API calls
export async function authenticatedApiCall(endpoint: string, token: string, options?: any): Promise<any> {
  return apiCall(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}
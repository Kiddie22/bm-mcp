import { request } from "http";
import { URL } from "url";

const NEST_API_URL = process.env.BASE_URL || "http://localhost:3000";

// Helper function to make API calls
export async function apiCall(endpoint: string, options?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${NEST_API_URL}${endpoint}`);
    const method = options?.method || 'GET';
    const body = options?.body;
    
    const req = request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`API call failed: ${res.statusCode} ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}
import { Buffer } from 'buffer';
import * as http from 'http';
import * as https from 'https';


export const joinUrl = (base: string | undefined, path: string): URL => {
  const b = base?.endsWith('/') ? base : `${base}/`;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return new URL(p, b);
};

/**
 * Sends a POST request to a specified URL with provided JSON data.
 *
 * This function handles both HTTP and HTTPS protocols, selecting the appropriate
 * module (`http` or `https`) based on the URL's protocol. It sends a JSON payload
 * and returns the server's response as a string.
 *
 * @param {URL} url - The destination URL for the POST request.
 * @param {string} data - JSON data to be sent in the POST request body.
 * @returns {Promise<string>} - A promise that resolves with the response body as a string.
 *
 * @throws {Error} Throws an error if the response status code is not in the 2xx range,
 * or if there is a network or request-related issue.
 */
export const post = async (url: URL, data: string): Promise<string> => {
  const useSSL = url.protocol === 'https:';
  const options = {
    hostname: url.hostname,
    port: url.port || (useSSL ? '443' : '80'),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  return new Promise((resolve, reject) => {
    const req = (useSSL ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(
            new Error(
              `HTTP Error: ${res.statusCode} ${res.statusMessage} - URL: ${url.href}`,
            ),
          );
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed to ${url.href}: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
};

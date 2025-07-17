import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Chatting App</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #5A7CBCFF, #3E71C9FF);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: #333;
          }
          .card {
            background: #f9f9f9;
            border-radius: 20px;
            padding: 2.5rem 3rem;
            box-shadow: 10px 10px 30px rgba(0,0,0,0.2), -5px -5px 15px rgba(255,255,255,0.3);
            text-align: center;
            max-width: 400px;
            animation: fadeIn 1s ease-in-out;
          }
          h1 {
            font-size: 2.2rem;
            color: #3271DFFF;
            margin-bottom: 1rem;
          }
          p {
            font-size: 1.1rem;
            margin: 0.5rem 0;
            color: #555;
          }
          .badge {
            display: inline-block;
            margin-top: 1rem;
            background: #4C76C0FF;
            color: #fff;
            padding: 0.4rem 1rem;
            border-radius: 999px;
            font-size: 0.9rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>💬 Chatting App</h1>
          <p>🚀 HTTP server is running on <strong>port 5000</strong></p>
          <p>🔗 WebSocket server is also available on <strong>port 5000</strong></p>
          <div class="badge">Ready to chat!</div>
        </div>
      </body>
      </html>
    `;
  }
}

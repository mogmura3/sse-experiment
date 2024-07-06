import { Controller, Get, Post, Res, Sse, } from '@nestjs/common';
import { Response } from 'express';
import { Observable, interval, map } from 'rxjs';
import * as http from 'http';

@Controller()
export class AppController {
  constructor() { }



  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((_) => {
        const largeData = this.generateLargeData(10);
        return ({ data: largeData } as MessageEvent)
      })
    );
  }

  /**
   * ReadableStreamのreadを使用しなければ、parseに失敗しないので
   * バックエンドは正常にデータを送信できている??
   */
  @Get('debug-sse-chunks')
  async debugSseChunks() {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/sse',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        const [type, raw] = chunk.split(': ');

        // デバッグ用のログ出力
        console.log('Chunk received:', JSON.parse(raw));
      });

      res.on('end', () => {
        console.log('Response ended');
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
    });

    req.end();
  }


  @Post('sse')
  ssePost(@Res() response: Response) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });



    const intervalSubscription = interval(1).pipe(
      map((_) => {
        const largeData = this.generateLargeData(1);
        return `data: ${JSON.stringify(largeData)}\n\n`;
      })
    ).subscribe((data) => response.write(data));

    response.once('drain', () => {
      console.log('------------------ Drain event fired, resuming writing...');

    })

    response.on('close', () => {
      intervalSubscription.unsubscribe();
      response.end();
    });
  }




  private generateLargeData(size: number): any {
    const data: any = {};
    for (let i = 0; i < size; i++) {
      data[`key${i}`] = 'あああ';
    }
    return data;
  }

}

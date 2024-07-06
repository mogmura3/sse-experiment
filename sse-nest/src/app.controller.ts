import { Controller, Get, Post, Res, Sse } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { Observable, interval, map } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }



  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((_) => {
        const largeData = this.generateLargeData(100000);
        return ({ data: largeData } as MessageEvent)
      })
    );
  }

  @Post('sse')
  ssePost(@Res() response: Response) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const intervalSubscription = interval(1000).pipe(
      map((_) => {
        const largeData = this.generateLargeData(100000);
        return `data: ${JSON.stringify(largeData)}\n\n`;
      })
    ).subscribe((data) => response.write(data));

    response.on('close', () => {
      intervalSubscription.unsubscribe();
      response.end();
    });
  }


  private generateLargeData(size: number): any {
    const data: any = {};
    for (let i = 0; i < size; i++) {
      data[`key${i}`] = `value${i}`;
    }
    return data;
  }
}

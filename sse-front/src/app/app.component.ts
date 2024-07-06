import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  dataSignal = signal<any[]>([]);

  ngOnInit() {
    this.fetchSse((data) => {
      // パースされたデータをシグナルで更新
      this.dataSignal.update((currentData) => [...currentData, data]);
    });
  }

  /**
   * SSE エンドポイントに接続し、データをストリームとして非同期に読み取ります。
   * @param {Function} callback - パースされたデータを処理するコールバック関数。
   */
  async fetchSse(callback: (data: any) => void) {
    const url = 'http://localhost:3000/sse';
    const res = await fetch(url, { method: 'POST' });
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = ''; // bufferをメソッド内に限定

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break; // ストリームの終わりを検出
        if (value) {
          // チャンクを処理し、更新されたバッファを受け取る
          buffer = this.processChunk(value, decoder, buffer, callback);
        }
      }
    }
  }

  /**
   * データチャンクをデコードし、バッファに追加します。
   * @param {Uint8Array} value - 読み取られたデータチャンク。
   * @param {TextDecoder} decoder - テキストデコーダー。
   * @param {string} buffer - 現在のバッファ。
   * @param {Function} callback - パースされたデータを処理するコールバック関数。
   * @returns {string} 更新されたバッファ。
   */
  processChunk(value: Uint8Array, decoder: TextDecoder, buffer: string, callback: (data: any) => void): string {
    // チャンクをデコードしてバッファに追加
    const decodedChunk = decoder.decode(value, { stream: true });
    buffer += decodedChunk;

    // デバッグ用のログ出力
    console.log('Chunk received:', decodedChunk);
    console.log('Current buffer state:', buffer);

    // バッファを処理して更新されたバッファを返す
    return this.handleBuffer(buffer, callback);
  }

  /**
   * バッファ内のデータを処理し、完全なメッセージを検出します。
   * @param {string} buffer - 処理対象のバッファ。
   * @param {Function} callback - パースされたデータを処理するコールバック関数。
   * @returns {string} 更新されたバッファ。
   */
  handleBuffer(buffer: string, callback: (data: any) => void): string {
    let boundary = buffer.indexOf('\n\n');

    // 断片化されたデータが存在するかをチェック
    if (boundary === -1 && buffer.length > 0) {
      console.log('Data fragment received:', buffer);  // 断片データをログに出力
    }

    // 完全なメッセージを処理
    while (boundary !== -1) {
      // 完全なメッセージを取り出して処理
      const completeMessage = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      this.processMessage(completeMessage, callback);

      // 次のメッセージを探す
      boundary = buffer.indexOf('\n\n');
    }

    // 更新されたバッファを返す
    return buffer;
  }

  /**
   * 完全なメッセージを処理し、JSON データを解析します。
   * @param {string} message - 完全なメッセージ。
   * @param {Function} callback - パースされたデータを処理するコールバック関数。
   */
  processMessage(message: string, callback: (data: any) => void) {
    const [type, raw] = message.split(': ');
    if (type === 'data' && raw) {
      try {
        // デバッグ用のログ出力
        console.log('Received data:', raw);
        const parsedData = JSON.parse(raw); // JSON データを解析
        callback(parsedData); // パースされたデータをコールバックで処理
      } catch (error) {
        // パースエラーをキャッチしてログに出力
        console.error('JSON parse error:', error);
        console.error('Raw data:', raw);
      }
    }
  }
}

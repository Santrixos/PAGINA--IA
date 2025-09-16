import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}

export class PythonExecutor extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning = false;

  async executeCode(code: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', ['-c', code], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';

      pythonProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        this.emit('output', chunk);
      });

      pythonProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        this.emit('error', chunk);
      });

      pythonProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output,
          error: code !== 0 ? error : undefined,
        });
      });

      pythonProcess.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message,
        });
      });
    });
  }

  startInteractiveSession(): void {
    if (this.isRunning) {
      this.stopInteractiveSession();
    }

    this.process = spawn('python3', ['-i'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.isRunning = true;

    this.process.stdout?.on('data', (data) => {
      this.emit('output', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.emit('error', data.toString());
    });

    this.process.on('close', () => {
      this.isRunning = false;
      this.process = null;
    });

    this.process.on('error', (err) => {
      this.emit('error', err.message);
      this.isRunning = false;
      this.process = null;
    });
  }

  sendCommand(command: string): void {
    if (this.process && this.isRunning) {
      this.process.stdin?.write(command + '\n');
    }
  }

  stopInteractiveSession(): void {
    if (this.process && this.isRunning) {
      this.process.kill();
      this.isRunning = false;
      this.process = null;
    }
  }

  isSessionRunning(): boolean {
    return this.isRunning;
  }
}

export const pythonExecutor = new PythonExecutor();

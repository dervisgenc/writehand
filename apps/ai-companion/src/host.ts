import { createHelperService, createHostDispatcher } from './host-dispatch';
import type { HostConfig } from './host-config';
import { encodeNativeMessage, NativeMessageDecoder } from './native-protocol';
import type { HostPlatform } from './platform';

/** The browser's native messaging host: framed requests on stdin, framed responses on stdout. */
export function runHost(platform: HostPlatform, config: HostConfig): void {
  // Native hosts write ONLY framed protocol messages to stdout, never logs or email content.
  const dispatcher = createHostDispatcher({ platform, config, service: createHelperService(platform) });

  async function handle(raw: unknown): Promise<void> {
    const result = await dispatcher.dispatch(raw);
    if (result === null) return;
    if (result.exitAfterAnswer) {
      process.stdout.write(encodeNativeMessage(result.response), shutdown);
      return;
    }
    process.stdout.write(encodeNativeMessage(result.response));
  }

  const decoder = new NativeMessageDecoder();
  decoder.on('data', (message: unknown) => {
    void handle(message);
  });
  const shutdown = () => {
    dispatcher.dispose();
    process.exit(0);
  };
  decoder.on('error', shutdown);
  process.stdin.on('end', shutdown);
  process.stdin.on('error', shutdown);
  process.stdout.on('error', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.stdin.pipe(decoder);
}

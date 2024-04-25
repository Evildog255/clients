import { ClientType, DeviceType } from "../../enums";

interface ToastOptions {
  timeout?: number;
}

export type ClipboardOptions = {
  allowHistory?: boolean;
  clearing?: boolean;
  clearMs?: number;
  window?: Window;
};

export abstract class PlatformUtilsService {
  abstract getDevice(): DeviceType;
  abstract getDeviceString(): string;
  abstract getClientType(): ClientType;
  abstract isFirefox(): boolean;
  abstract isChrome(): boolean;
  abstract isEdge(): boolean;
  abstract isOpera(): boolean;
  abstract isVivaldi(): boolean;
  abstract isSafari(): boolean;
  abstract isMacAppStore(): boolean;
  abstract isViewOpen(): Promise<boolean>;
  abstract launchUri(uri: string, options?: any): void;
  abstract getApplicationVersion(): Promise<string>;
  abstract getApplicationVersionNumber(): Promise<string>;
  abstract supportsWebAuthn(win: Window): boolean;
  abstract supportsDuo(): boolean;
  abstract showToast(
    type: "error" | "success" | "warning" | "info",
    title: string,
    text: string | string[],
    options?: ToastOptions,
  ): void;
  abstract isDev(): boolean;
  abstract isSelfHost(): boolean;
  abstract copyToClipboard(text: string, options?: ClipboardOptions): void | boolean;
  abstract readFromClipboard(): Promise<string>;
  abstract supportsBiometric(): Promise<boolean>;
  abstract biometricsNeedsSetup: () => Promise<boolean>;
  abstract biometricsSetup: () => Promise<void>;
  abstract authenticateBiometric(): Promise<boolean>;
  abstract supportsSecureStorage(): boolean;
  abstract getAutofillKeyboardShortcut(): Promise<string>;
}

export type Processed = {
  bytes: Uint8Array;
  width: number;
  height: number;
  still: boolean;
};

export type ProgressFn = (progress: number, message: string) => void;

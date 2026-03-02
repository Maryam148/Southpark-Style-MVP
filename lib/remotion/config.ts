/**
 * Remotion render configuration.
 *
 * All AWS / Remotion env vars are validated here so failures surface at
 * call-time with a clear message, not deep inside the render pipeline.
 */

export const REMOTION_REGION =
  (process.env.REMOTION_AWS_REGION ?? "us-east-1") as
  | "us-east-1"
  | "us-west-2"
  | "eu-west-1"
  | "ap-southeast-1";

/** Codec used for all episode exports. h264 = widest device compatibility. */
export const RENDER_CODEC = "h264" as const;

/** JPEG quality for intermediate frames. 90 = near-lossless, keeps file size sane. */
export const FRAME_JPEG_QUALITY = 90;

/**
 * How many frames each Lambda invocation renders.
 * Lower → more Lambdas → more parallelism → faster, higher cost.
 * 40 is a reasonable default for 30fps compositions.
 */
export const FRAMES_PER_LAMBDA = 40;

/** Remotion Lambda function spec — must match what was deployed via CLI. */
export const LAMBDA_SPEC = {
  memorySizeInMb: 3009,
  diskSizeInMb: 10240,
  timeoutInSeconds: 240,
} as const;

/** Rendered files are auto-deleted from S3 after this window. */
export const S3_DELETE_AFTER = "7-days" as const;

export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export function getServeUrl(): string {
  return requireEnv("REMOTION_SERVE_URL");
}

/** Malformed inputs/scenario file: CLI exits with code 2. */
export class InputFormatError extends Error {}
/** Bad command line usage: CLI exits with code 1. */
export class UsageError extends Error {}

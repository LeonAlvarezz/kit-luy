type Mode = "dev" | "prod" | "test";

export function getMode(args: string[]): Mode {
  if (args.includes("--test") || args.includes("test")) {
    return "test";
  }

  if (args.includes("--prod") || args.includes("prod")) {
    return "prod";
  }

  if (args.includes("--dev") || args.includes("dev")) {
    return "dev";
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.NODE_ENV === "production") {
    return "prod";
  }

  return "dev";
}

export function getEnvFile(mode: Mode) {
  switch (mode) {
    case "test":
      return ".env.test";
    case "prod":
      return ".env.prod";
    default:
      return ".env";
  }
}

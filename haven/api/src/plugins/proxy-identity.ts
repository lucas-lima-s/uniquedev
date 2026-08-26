import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../env.js";

export interface AccessIdentity {
  email: string;
  sub: string;
}

declare module "fastify" {
  interface FastifyRequest {
    accessIdentity?: AccessIdentity;
  }
}

type AccessHook = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

const DEV_IDENTITY: AccessIdentity = { email: "dev@haven.local", sub: "dev" };

function buildDevHook(): AccessHook {
  return async (request) => {
    request.accessIdentity = DEV_IDENTITY;
  };
}

function buildProxyHook(): AccessHook {
  if (!env.AUTH_JWKS_URL || !env.AUTH_ISSUER || !env.AUTH_AUDIENCE) {
    throw new Error(
      "AUTH_JWKS_URL, AUTH_ISSUER and AUTH_AUDIENCE are required when AUTH_MODE=proxy",
    );
  }
  const jwks = createRemoteJWKSet(new URL(env.AUTH_JWKS_URL));
  const issuer = env.AUTH_ISSUER;
  const audience = env.AUTH_AUDIENCE;
  const headerName = env.AUTH_IDENTITY_HEADER.toLowerCase();

  return async (request, reply) => {
    const token = request.headers[headerName];
    if (typeof token !== "string" || token.length === 0) {
      return reply.code(401).send({ error: "missing_access_token" });
    }
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience });
      request.accessIdentity = {
        email: typeof payload.email === "string" ? payload.email : "",
        sub: payload.sub ?? "",
      };
    } catch (error) {
      request.log.warn({ err: error }, "identity proxy token rejected");
      return reply.code(401).send({ error: "invalid_access_token" });
    }
  };
}

export const verifyProxyIdentity: AccessHook =
  env.AUTH_MODE === "dev" ? buildDevHook() : buildProxyHook();

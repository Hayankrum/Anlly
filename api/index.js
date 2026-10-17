// server/vercel.ts
import { getRequestListener } from "@hono/node-server";

// server/app.ts
import { Hono as Hono3 } from "hono";
import { bodyLimit } from "hono/body-limit";
import { serveStatic } from "@hono/node-server/serve-static";

// server/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// server/env.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL \xE9 obrigat\xF3ria"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET deve ter no m\xEDnimo 32 caracteres"),
  APP_URL: z.string().url("APP_URL deve ser uma URL v\xE1lida").default("http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(3e3)
});
var env = envSchema.parse(process.env);

// server/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";

// server/generated/prisma/client.ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import "@prisma/client/runtime/client";

// server/generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.10.0",
  "engineVersion": "0edf323efd1d98336f3f0a68684b56f689b900d3",
  "activeProvider": "postgresql",
  "inlineSchema": '// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\n// Get a free hosted Postgres database in seconds: `npx create-db`\n\ngenerator client {\n  provider = "prisma-client"\n  output   = "../server/generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nmodel User {\n  id                 String         @id\n  name               String\n  email              String\n  emailVerified      Boolean        @default(false)\n  image              String?\n  createdAt          DateTime       @default(now())\n  updatedAt          DateTime       @updatedAt\n  // Contador monot\xF4nico por usu\xE1rio: fonte do serverSeq/cursor de sync.\n  // Incrementado dentro da transa\xE7\xE3o de push (serializa as escritas do usu\xE1rio).\n  seq                BigInt         @default(0)\n  // Aceite dos Termos de uso/privacidade: vers\xE3o + data/hora (prova de consentimento).\n  aceiteTermosEm     DateTime?\n  aceiteTermosVersao String?\n  sessions           Session[]\n  accounts           Account[]\n  itens              Item[]\n  mutacoes           SyncMutation[]\n\n  @@unique([email])\n  @@map("user")\n}\n\nmodel Session {\n  id        String   @id\n  expiresAt DateTime\n  token     String\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  ipAddress String?\n  userAgent String?\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([token])\n  @@index([userId])\n  @@map("session")\n}\n\nmodel Account {\n  id                    String    @id\n  accountId             String\n  providerId            String\n  userId                String\n  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  accessToken           String?\n  refreshToken          String?\n  idToken               String?\n  accessTokenExpiresAt  DateTime?\n  refreshTokenExpiresAt DateTime?\n  scope                 String?\n  password              String?\n  createdAt             DateTime  @default(now())\n  updatedAt             DateTime  @updatedAt\n\n  @@index([userId])\n  @@map("account")\n}\n\nmodel Verification {\n  id         String   @id\n  identifier String\n  value      String\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@index([identifier])\n  @@map("verification")\n}\n\n// Dados sincroniz\xE1veis. Epoch ms (BigInt) igual ao cliente; serverSeq \xE9 o\n// cursor por usu\xE1rio e tamb\xE9m o serverVersion devolvido ao cliente.\nmodel Item {\n  id              String   @id\n  userId          String\n  titulo          String\n  descricao       String\n  concluido       Boolean  @default(false)\n  // Agendamento opcional: v\xE1rios dias (YYYY-MM-DD) + um hor\xE1rio (HH:mm) que\n  // vale para todos eles.\n  diasAgendamento String[]\n  horaAgendamento String?\n  criadoEm        BigInt\n  updatedAt       BigInt\n  deletedAt       BigInt?\n  serverSeq       BigInt\n  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId, serverSeq])\n  @@map("item")\n}\n\n// Log de idempot\xEAncia do push: cada id de muta\xE7\xE3o aplicada (ou avaliada como\n// "ignorada") aparece no m\xE1ximo uma vez \u2014 reenviar o mesmo lote n\xE3o duplica.\nmodel SyncMutation {\n  id        String @id\n  userId    String\n  appliedAt BigInt\n  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n  @@map("sync_mutation")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"emailVerified","kind":"scalar","type":"Boolean"},{"name":"image","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"seq","kind":"scalar","type":"BigInt"},{"name":"aceiteTermosEm","kind":"scalar","type":"DateTime"},{"name":"aceiteTermosVersao","kind":"scalar","type":"String"},{"name":"sessions","kind":"object","type":"Session","relationName":"SessionToUser"},{"name":"accounts","kind":"object","type":"Account","relationName":"AccountToUser"},{"name":"itens","kind":"object","type":"Item","relationName":"ItemToUser"},{"name":"mutacoes","kind":"object","type":"SyncMutation","relationName":"SyncMutationToUser"}],"dbName":"user","schema":null},"Session":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"token","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"userAgent","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"SessionToUser"}],"dbName":"session","schema":null},"Account":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"accountId","kind":"scalar","type":"String"},{"name":"providerId","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AccountToUser"},{"name":"accessToken","kind":"scalar","type":"String"},{"name":"refreshToken","kind":"scalar","type":"String"},{"name":"idToken","kind":"scalar","type":"String"},{"name":"accessTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"refreshTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"scope","kind":"scalar","type":"String"},{"name":"password","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"account","schema":null},"Verification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"identifier","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"verification","schema":null},"Item":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"titulo","kind":"scalar","type":"String"},{"name":"descricao","kind":"scalar","type":"String"},{"name":"concluido","kind":"scalar","type":"Boolean"},{"name":"diasAgendamento","kind":"scalar","type":"String"},{"name":"horaAgendamento","kind":"scalar","type":"String"},{"name":"criadoEm","kind":"scalar","type":"BigInt"},{"name":"updatedAt","kind":"scalar","type":"BigInt"},{"name":"deletedAt","kind":"scalar","type":"BigInt"},{"name":"serverSeq","kind":"scalar","type":"BigInt"},{"name":"user","kind":"object","type":"User","relationName":"ItemToUser"}],"dbName":"item","schema":null},"SyncMutation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"appliedAt","kind":"scalar","type":"BigInt"},{"name":"user","kind":"object","type":"User","relationName":"SyncMutationToUser"}],"dbName":"sync_mutation","schema":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","user","sessions","accounts","itens","mutacoes","_count","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_avg","_sum","_min","_max","User.groupBy","User.aggregate","Session.findUnique","Session.findUniqueOrThrow","Session.findFirst","Session.findFirstOrThrow","Session.findMany","Session.createOne","Session.createMany","Session.createManyAndReturn","Session.updateOne","Session.updateMany","Session.updateManyAndReturn","Session.upsertOne","Session.deleteOne","Session.deleteMany","Session.groupBy","Session.aggregate","Account.findUnique","Account.findUniqueOrThrow","Account.findFirst","Account.findFirstOrThrow","Account.findMany","Account.createOne","Account.createMany","Account.createManyAndReturn","Account.updateOne","Account.updateMany","Account.updateManyAndReturn","Account.upsertOne","Account.deleteOne","Account.deleteMany","Account.groupBy","Account.aggregate","Verification.findUnique","Verification.findUniqueOrThrow","Verification.findFirst","Verification.findFirstOrThrow","Verification.findMany","Verification.createOne","Verification.createMany","Verification.createManyAndReturn","Verification.updateOne","Verification.updateMany","Verification.updateManyAndReturn","Verification.upsertOne","Verification.deleteOne","Verification.deleteMany","Verification.groupBy","Verification.aggregate","Item.findUnique","Item.findUniqueOrThrow","Item.findFirst","Item.findFirstOrThrow","Item.findMany","Item.createOne","Item.createMany","Item.createManyAndReturn","Item.updateOne","Item.updateMany","Item.updateManyAndReturn","Item.upsertOne","Item.deleteOne","Item.deleteMany","Item.groupBy","Item.aggregate","SyncMutation.findUnique","SyncMutation.findUniqueOrThrow","SyncMutation.findFirst","SyncMutation.findFirstOrThrow","SyncMutation.findMany","SyncMutation.createOne","SyncMutation.createMany","SyncMutation.createManyAndReturn","SyncMutation.updateOne","SyncMutation.updateMany","SyncMutation.updateManyAndReturn","SyncMutation.upsertOne","SyncMutation.deleteOne","SyncMutation.deleteMany","SyncMutation.groupBy","SyncMutation.aggregate","AND","OR","NOT","id","userId","appliedAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","titulo","descricao","concluido","diasAgendamento","horaAgendamento","criadoEm","updatedAt","deletedAt","serverSeq","has","hasEvery","hasSome","identifier","value","expiresAt","createdAt","accountId","providerId","accessToken","refreshToken","idToken","accessTokenExpiresAt","refreshTokenExpiresAt","scope","password","token","ipAddress","userAgent","name","email","emailVerified","image","seq","aceiteTermosEm","aceiteTermosVersao","every","some","none","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide","push"]'),
  graph: "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-wEAIAUAAPwBACAGAAD9AQAgBwAA_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_AQAAAAGAAQEAAAABgQEBAAAAAQ0IAACuAQAgGwAArwEAIBwAALABACAdAACwAQAgHgAAsAEAIHcEAAAAAXgEAAAABXkEAAAABXoEAAAAAXsEAAAAAXwEAAAAAX0EAAAAAX4EAK0BACENCAAArgEAIBsAAK8BACAcAACwAQAgHQAAsAEAIB4AALABACB3BAAAAAF4BAAAAAV5BAAAAAV6BAAAAAF7BAAAAAF8BAAAAAF9BAAAAAF-BACtAQAhCHcCAAAAAXgCAAAABXkCAAAABXoCAAAAAXsCAAAAAXwCAAAAAX0CAAAAAX4CAK4BACEIdwgAAAABeAgAAAAFeQgAAAAFeggAAAABewgAAAABfAgAAAABfQgAAAABfggArwEAIQh3BAAAAAF4BAAAAAV5BAAAAAV6BAAAAAF7BAAAAAF8BAAAAAF9BAAAAAF-BACwAQAhDggAAK4BACAdAACyAQAgHgAAsgEAIHcBAAAAAXgBAAAABXkBAAAABXoBAAAAAXsBAAAAAXwBAAAAAX0BAAAAAX4BALEBACF_AQAAAAGAAQEAAAABgQEBAAAAAQt3AQAAAAF4AQAAAAV5AQAAAAV6AQAAAAF7AQAAAAF8AQAAAAF9AQAAAAF-AQCyAQAhfwEAAAABgAEBAAAAAYEBAQAAAAEFCAAAowEAIB0AALQBACAeAAC0AQAgdyAAAAABfiAAswEAIQJ3IAAAAAF-IAC0AQAhCXEAALUBADByAABwABBzAAC1AQAwdAEAoAEAIYgBQAC2AQAhjgEBAKABACGPAQEAoAEAIZABQAC2AQAhkQFAALYBACELCAAAowEAIB0AALgBACAeAAC4AQAgd0AAAAABeEAAAAAEeUAAAAAEekAAAAABe0AAAAABfEAAAAABfUAAAAABfkAAtwEAIQsIAACjAQAgHQAAuAEAIB4AALgBACB3QAAAAAF4QAAAAAR5QAAAAAR6QAAAAAF7QAAAAAF8QAAAAAF9QAAAAAF-QAC3AQAhCHdAAAAAAXhAAAAABHlAAAAABHpAAAAAAXtAAAAAAXxAAAAAAX1AAAAAAX5AALgBACEJcQAAuQEAMHIAAF0AEHMAALkBADB0AQC6AQAhiAFAALsBACGOAQEAugEAIY8BAQC6AQAhkAFAALsBACGRAUAAuwEAIQt3AQAAAAF4AQAAAAR5AQAAAAR6AQAAAAF7AQAAAAF8AQAAAAF9AQAAAAF-AQCnAQAhfwEAAAABgAEBAAAAAYEBAQAAAAEId0AAAAABeEAAAAAEeUAAAAAEekAAAAABe0AAAAABfEAAAAABfUAAAAABfkAAuAEAIRBxAAC8AQAwcgAAVwAQcwAAvAEAMHQBAKABACF1AQCgAQAhiAFAALYBACGRAUAAtgEAIZIBAQCgAQAhkwEBAKABACGUAQEAqwEAIZUBAQCrAQAhlgEBAKsBACGXAUAAvQEAIZgBQAC9AQAhmQEBAKsBACGaAQEAqwEAIQsIAACuAQAgHQAAvwEAIB4AAL8BACB3QAAAAAF4QAAAAAV5QAAAAAV6QAAAAAF7QAAAAAF8QAAAAAF9QAAAAAF-QAC-AQAhCwgAAK4BACAdAAC_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_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_wEAMKoBAACAAgAwrAEAAIICACCwAQAAgwIAMAAAAAAHBAAAswIAIAUAALQCACAGAAC1AgAgBwAAtgIAIKEBAADaAQAgowEAANoBACCkAQAA2gEAIAd0AQAAAAGIAUAAAAABkAFAAAAAAZEBQAAAAAGbAQEAAAABnAEBAAAAAZ0BAQAAAAEMdAEAAAABiAFAAAAAAZEBQAAAAAGSAQEAAAABkwEBAAAAAZQBAQAAAAGVAQEAAAABlgEBAAAAAZcBQAAAAAGYAUAAAAABmQEBAAAAAZoBAQAAAAEKdAEAAAABggEBAAAAAYMBAQAAAAGEASAAAAABhQEAAOUBACCGAQEAAAABhwEEAAAAAYgBBAAAAAGJAQQAAAABigEEAAAAAQJ0AQAAAAF2BAAAAAENBQAAsAIAIAYAALECACAHAACyAgAgdAEAAAABiAFAAAAAAZEBQAAAAAGeAQEAAAABnwEBAAAAAaABIAAAAAGhAQEAAAABogEEAAAAAaMBQAAAAAGkAQEAAAABAgAAAAEAIBUAALwCACADAAAAGAAgFQAAvAIAIBYAAMACACAPAAAAGAAgBQAA_AEAIAYAAP0BACAHAAD-AQAgDgAAwAIAIHQBANYBACGIAUAA6gEAIZEBQADqAQAhngEBANYBACGfAQEA1gEAIaABIADgAQAhoQEBAOIBACGiAQQA1wEAIaMBQADuAQAhpAEBAOIBACENBQAA_AEAIAYAAP0BACAHAAD-AQAgdAEA1gEAIYgBQADqAQAhkQFAAOoBACGeAQEA1gEAIZ8BAQDWAQAhoAEgAOABACGhAQEA4gEAIaIBBADXAQAhowFAAO4BACGkAQEA4gEAIQ0EAACvAgAgBgAAsQIAIAcAALICACB0AQAAAAGIAUAAAAABkQFAAAAAAZ4BAQAAAAGfAQEAAAABoAEgAAAAAaEBAQAAAAGiAQQAAAABowFAAAAAAaQBAQAAAAECAAAAAQAgFQAAwQIAIAMAAAAYACAVAADBAgAgFgAAxQIAIA8AAAAYACAEAAD7AQAgBgAA_QEAIAcAAP4BACAOAADFAgAgdAEA1gEAIYgBQADqAQAhkQFAAOoBACGeAQEA1gEAIZ8BAQDWAQAhoAEgAOABACGhAQEA4gEAIaIBBADXAQAhowFAAO4BACGkAQEA4gEAIQ0EAAD7AQAgBgAA_QEAIAcAAP4BACB0AQDWAQAhiAFAAOoBACGRAUAA6gEAIZ4BAQDWAQAhnwEBANYBACGgASAA4AEAIaEBAQDiAQAhogEEANcBACGjAUAA7gEAIaQBAQDiAQAhDQQAAK8CACAFAACwAgAgBwAAsgIAIHQBAAAAAYgBQAAAAAGRAUAAAAABngEBAAAAAZ8BAQAAAAGgASAAAAABoQEBAAAAAaIBBAAAAAGjAUAAAAABpAEBAAAAAQIAAAABACAVAADGAgAgAwAAABgAIBUAAMYCACAWAADKAgAgDwAAABgAIAQAAPsBACAFAAD8AQAgBwAA_gEAIA4AAMoCACB0AQDWAQAhiAFAAOoBACGRAUAA6gEAIZ4BAQDWAQAhnwEBANYBACGgASAA4AEAIaEBAQDiAQAhogEEANcBACGjAUAA7gEAIaQBAQDiAQAhDQQAAPsBACAFAAD8AQAgBwAA_gEAIHQBANYBACGIAUAA6gEAIZEBQADqAQAhngEBANYBACGfAQEA1gEAIaABIADgAQAhoQEBAOIBACGiAQQA1wEAIaMBQADuAQAhpAEBAOIBACENBAAArwIAIAUAALACACAGAACxAgAgdAEAAAABiAFAAAAAAZEBQAAAAAGeAQEAAAABnwEBAAAAAaABIAAAAAGhAQEAAAABogEEAAAAAaMBQAAAAAGkAQEAAAABAgAAAAEAIBUAAMsCACADAAAAGAAgFQAAywIAIBYAAM8CACAPAAAAGAAgBAAA-wEAIAUAAPwBACAGAAD9AQAgDgAAzwIAIHQBANYBACGIAUAA6gEAIZEBQADqAQAhngEBANYBACGfAQEA1gEAIaABIADgAQAhoQEBAOIBACGiAQQA1wEAIaMBQADuAQAhpAEBAOIBACENBAAA-wEAIAUAAPwBACAGAAD9AQAgdAEA1gEAIYgBQADqAQAhkQFAAOoBACGeAQEA1gEAIZ8BAQDWAQAhoAEgAOABACGhAQEA4gEAIaIBBADXAQAhowFAAO4BACGkAQEA4gEAIQUEBgIFCgMGDgQHEgUIAAYBAwABAQMAAQEDAAEBAwABBAQTAAUUAAYVAAcWAAAAAAUIAAsbAAwcAA0dAA4eAA8AAAAAAAUIAAsbAAwcAA0dAA4eAA8BAwABAQMAAQMIABQdABUeABYAAAADCAAUHQAVHgAWAQMAAQEDAAEDCAAbHQAcHgAdAAAAAwgAGx0AHB4AHQAAAAMIACMdACQeACUAAAADCAAjHQAkHgAlAQMAAQEDAAEFCAAqGwArHAAsHQAtHgAuAAAAAAAFCAAqGwArHAAsHQAtHgAuAQMAAQEDAAEFCAAzGwA0HAA1HQA2HgA3AAAAAAAFCAAzGwA0HAA1HQA2HgA3CQIBChcBCxoBDBsBDRwBDx4BECAHESEIEiMBEyUHFCYJFycBGCgBGSkHHywKIC0QIS4CIi8CIzACJDECJTICJjQCJzYHKDcRKTkCKjsHKzwSLD0CLT4CLj8HL0ITMEMXMUQDMkUDM0YDNEcDNUgDNkoDN0wHOE0YOU8DOlEHO1IZPFMDPVQDPlUHP1gaQFkeQVsfQlwfQ18fRGAfRWEfRmMfR2UHSGYgSWgfSmoHS2shTGwfTW0fTm4HT3EiUHImUXMEUnQEU3UEVHYEVXcEVnkEV3sHWHwnWX4EWoABB1uBAShcggEEXYMBBF6EAQdfhwEpYIgBL2GJAQViigEFY4sBBWSMAQVljQEFZo8BBWeRAQdokgEwaZQBBWqWAQdrlwExbJgBBW2ZAQVumgEHb50BMnCeATg"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer } = await import("node:buffer");
  const wasmArray = Buffer.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// server/generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// server/generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// server/prisma.ts
var adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
var prisma = new PrismaClient({ adapter });

// server/auth.ts
var origensDev = [
  .../* @__PURE__ */ new Set([
    new URL(env.APP_URL).origin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
  ])
];
var auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.APP_URL,
  trustedOrigins: env.NODE_ENV === "development" ? origensDev : [],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5
    }
  },
  // get-session é chamado a cada ciclo de sync; em dev fica livre (padrão better-auth)
  rateLimit: {
    enabled: env.NODE_ENV === "production",
    window: 60,
    max: 120
  }
});

// server/sync.ts
import { Hono as Hono2 } from "hono";

// shared/schemas/sync.ts
import { z as z4 } from "zod";

// shared/schemas/item.ts
import { z as z2 } from "zod";
var DATA_AGENDAMENTO_RE = /^\d{4}-\d{2}-\d{2}$/;
var HORA_AGENDAMENTO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
var LIMITE_DIAS_AGENDAMENTO = 400;
var itemSchema = z2.object({
  id: z2.string().min(1),
  titulo: z2.string(),
  descricao: z2.string(),
  concluido: z2.boolean(),
  /** Opcional: dias do agendamento (YYYY-MM-DD, sem fuso). Um item pode marcar vários. */
  diasAgendamento: z2.array(z2.string().regex(DATA_AGENDAMENTO_RE)).max(LIMITE_DIAS_AGENDAMENTO).optional(),
  /** Opcional: horário do agendamento (HH:mm, 24h) — mesmo horário em todos os dias. */
  horaAgendamento: z2.string().regex(HORA_AGENDAMENTO_RE).optional(),
  criadoEm: z2.number(),
  updatedAt: z2.number(),
  deletedAt: z2.number().optional(),
  serverVersion: z2.number().int().positive().optional()
});

// shared/schemas/outbox.ts
import { z as z3 } from "zod";
var operacaoOutboxSchema = z3.enum(["upsert", "delete"]);
var mutacaoSchema = z3.object({
  id: z3.string().min(1),
  tabela: z3.string().min(1),
  registroId: z3.string().min(1),
  operacao: operacaoOutboxSchema,
  payload: itemSchema
});

// shared/schemas/sync.ts
var TABELA_ITEMS = "items";
var LIMITE_MUTACOES = 500;
var LIMITE_PULL = 500;
var PADRAO_PULL = 100;
var pushRequestSchema = z4.object({
  mutacoes: z4.array(mutacaoSchema).min(1).max(LIMITE_MUTACOES)
});
var statusMutacaoSchema = z4.enum(["aplicada", "ignorada", "invalida"]);
var resultadoMutacaoSchema = z4.object({
  mutacaoId: z4.string().min(1),
  status: statusMutacaoSchema,
  serverVersion: z4.number().int().positive().optional(),
  registro: itemSchema.optional()
});
var pushResponseSchema = z4.object({
  resultados: z4.array(resultadoMutacaoSchema),
  proximoCursor: z4.string()
});
var pullQuerySchema = z4.object({
  cursor: z4.string().regex(/^\d+$/).default("0"),
  limit: z4.coerce.number().int().min(1).max(LIMITE_PULL).default(PADRAO_PULL)
});
var pullResponseSchema = z4.object({
  registros: z4.array(itemSchema),
  proximoCursor: z4.string(),
  temMais: z4.boolean()
});

// server/session.ts
async function exigirSessao(c) {
  const sessao = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!sessao) return null;
  return { userId: sessao.user.id, email: sessao.user.email };
}

// server/termos.ts
import { Hono } from "hono";

// shared/termos.ts
import { z as z5 } from "zod";
var TERMOS_VERSAO = "1.0";
var termosStatusSchema = z5.object({
  versaoAtual: z5.string().min(1),
  precisaAceitar: z5.boolean(),
  aceite: z5.object({
    versao: z5.string(),
    em: z5.number()
  }).nullable()
});
var aceitarTermosSchema = z5.object({
  versao: z5.string().min(1)
});

// server/termos.ts
async function statusDoUsuario(userId) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { aceiteTermosEm: true, aceiteTermosVersao: true }
  });
  const em = usuario?.aceiteTermosEm ?? null;
  const versao = usuario?.aceiteTermosVersao ?? null;
  const aceite = em !== null && versao !== null ? { versao, em: em.getTime() } : null;
  return {
    versaoAtual: TERMOS_VERSAO,
    precisaAceitar: aceite === null || aceite.versao !== TERMOS_VERSAO,
    aceite
  };
}
async function exigirTermosAceitos(userId) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { aceiteTermosVersao: true }
  });
  return usuario?.aceiteTermosVersao === TERMOS_VERSAO;
}
var termosRoutes = new Hono();
termosRoutes.get("/termos/status", async (c) => {
  const sessao = await exigirSessao(c);
  if (!sessao) return c.json({ erro: "N\xE3o autenticado", code: "UNAUTHORIZED" }, 401);
  return c.json(await statusDoUsuario(sessao.userId));
});
termosRoutes.post("/termos/aceitar", async (c) => {
  const sessao = await exigirSessao(c);
  if (!sessao) return c.json({ erro: "N\xE3o autenticado", code: "UNAUTHORIZED" }, 401);
  const bruto = await c.req.json().catch(() => null);
  const parse = aceitarTermosSchema.safeParse(bruto);
  if (!parse.success) {
    return c.json({ erro: "Payload inv\xE1lido", code: "INVALID_PAYLOAD" }, 400);
  }
  if (parse.data.versao !== TERMOS_VERSAO) {
    return c.json({ erro: "Vers\xE3o do termo inv\xE1lida", code: "VERSAO_INVALIDA" }, 400);
  }
  await prisma.user.update({
    where: { id: sessao.userId },
    data: { aceiteTermosEm: /* @__PURE__ */ new Date(), aceiteTermosVersao: TERMOS_VERSAO }
  });
  return c.json(await statusDoUsuario(sessao.userId));
});

// server/sync.ts
var JANELA_FUTURO_MS = 5 * 60 * 1e3;
var JANELA_PASSADO_MS = 90 * 24 * 60 * 60 * 1e3;
function toWire(item) {
  const base = {
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    concluido: item.concluido,
    ...item.diasAgendamento.length === 0 ? {} : { diasAgendamento: item.diasAgendamento },
    ...item.horaAgendamento === null ? {} : { horaAgendamento: item.horaAgendamento },
    criadoEm: Number(item.criadoEm),
    updatedAt: Number(item.updatedAt),
    serverVersion: Number(item.serverSeq)
  };
  return item.deletedAt === null ? base : { ...base, deletedAt: Number(item.deletedAt) };
}
async function processarLote(userId, mutacoes, resultados) {
  const agoraMs = Date.now();
  const limiteTs = agoraMs + JANELA_FUTURO_MS;
  const pisoTs = agoraMs - JANELA_PASSADO_MS;
  await prisma.$transaction(async (tx) => {
    const inicial = await tx.user.update({
      where: { id: userId },
      data: { seq: { increment: 1 } },
      select: { seq: true }
    });
    let seqReservado = inicial.seq;
    const proximoSeq = async () => {
      if (seqReservado !== null) {
        const reservado = seqReservado;
        seqReservado = null;
        return reservado;
      }
      const { seq } = await tx.user.update({
        where: { id: userId },
        data: { seq: { increment: 1 } },
        select: { seq: true }
      });
      return seq;
    };
    for (const mut of mutacoes) {
      if (mut.tabela !== TABELA_ITEMS) {
        await tx.syncMutation.create({
          data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) }
        });
        resultados.push({ mutacaoId: mut.id, status: "invalida" });
        continue;
      }
      const jaVista = await tx.syncMutation.findUnique({ where: { id: mut.id } });
      if (jaVista) {
        const atual = await tx.item.findUnique({ where: { id: mut.registroId } });
        if (atual && atual.userId === userId) {
          resultados.push({
            mutacaoId: mut.id,
            status: "aplicada",
            serverVersion: Number(atual.serverSeq),
            registro: toWire(atual)
          });
        } else {
          resultados.push({ mutacaoId: mut.id, status: "aplicada" });
        }
        continue;
      }
      const existente = await tx.item.findUnique({ where: { id: mut.registroId } });
      if (existente && existente.userId !== userId) {
        await tx.syncMutation.create({
          data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) }
        });
        resultados.push({ mutacaoId: mut.id, status: "invalida" });
        continue;
      }
      const updatedAt = Math.min(Math.max(mut.payload.updatedAt, pisoTs), limiteTs);
      let deletedAt = mut.payload.deletedAt;
      if (deletedAt !== void 0 && deletedAt > updatedAt) deletedAt = updatedAt;
      if (existente && existente.updatedAt > BigInt(updatedAt)) {
        await tx.syncMutation.create({
          data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) }
        });
        resultados.push({
          mutacaoId: mut.id,
          status: "ignorada",
          serverVersion: Number(existente.serverSeq),
          registro: toWire(existente)
        });
        continue;
      }
      const seq = await proximoSeq();
      const dadosItem = {
        titulo: mut.payload.titulo,
        descricao: mut.payload.descricao,
        concluido: mut.payload.concluido,
        diasAgendamento: mut.payload.diasAgendamento ?? [],
        horaAgendamento: mut.payload.horaAgendamento ?? null,
        updatedAt: BigInt(updatedAt),
        serverSeq: seq
      };
      const dadosComTombstone = deletedAt === void 0 ? dadosItem : { ...dadosItem, deletedAt: BigInt(deletedAt) };
      const gravado = await tx.item.upsert({
        where: { id: mut.registroId },
        create: {
          id: mut.registroId,
          userId,
          criadoEm: BigInt(mut.payload.criadoEm),
          deletedAt: null,
          ...dadosComTombstone
        },
        update: dadosComTombstone
      });
      await tx.syncMutation.create({
        data: { id: mut.id, userId, appliedAt: BigInt(agoraMs) }
      });
      resultados.push({
        mutacaoId: mut.id,
        status: "aplicada",
        serverVersion: Number(seq),
        registro: toWire(gravado)
      });
    }
    if (seqReservado !== null) {
      await tx.user.update({
        where: { id: userId },
        data: { seq: { decrement: 1 } }
      });
    }
  });
}
function ehConflitoConcorrente(erro) {
  return typeof erro === "object" && erro !== null && "code" in erro && erro.code === "P2002";
}
var syncRoutes = new Hono2();
syncRoutes.post("/sync/push", async (c) => {
  const sessao = await exigirSessao(c);
  if (!sessao) return c.json({ erro: "N\xE3o autenticado", code: "UNAUTHORIZED" }, 401);
  if (!await exigirTermosAceitos(sessao.userId)) {
    return c.json({ erro: "Aceite os termos de uso para sincronizar", code: "TERMOS_PENDENTES" }, 403);
  }
  const bruto = await c.req.json().catch(() => null);
  const parse = pushRequestSchema.safeParse(bruto);
  if (!parse.success) {
    return c.json({ erro: "Payload inv\xE1lido", detalhes: parse.error.issues }, 400);
  }
  const resultados = [];
  try {
    try {
      await processarLote(sessao.userId, parse.data.mutacoes, resultados);
    } catch (erro) {
      if (!ehConflitoConcorrente(erro)) throw erro;
      resultados.length = 0;
      await processarLote(sessao.userId, parse.data.mutacoes, resultados);
    }
  } catch (erro) {
    console.error("push falhou", erro);
    return c.json({ erro: "Falha ao processar o lote" }, 500);
  }
  const usuario = await prisma.user.findUnique({
    where: { id: sessao.userId },
    select: { seq: true }
  });
  return c.json({ resultados, proximoCursor: String(usuario?.seq ?? 0n) });
});
syncRoutes.get("/sync/pull", async (c) => {
  const sessao = await exigirSessao(c);
  if (!sessao) return c.json({ erro: "N\xE3o autenticado", code: "UNAUTHORIZED" }, 401);
  if (!await exigirTermosAceitos(sessao.userId)) {
    return c.json({ erro: "Aceite os termos de uso para sincronizar", code: "TERMOS_PENDENTES" }, 403);
  }
  const parse = pullQuerySchema.safeParse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit")
  });
  if (!parse.success) {
    return c.json({ erro: "Query inv\xE1lida", detalhes: parse.error.issues }, 400);
  }
  const { cursor, limit } = parse.data;
  const linhas = await prisma.item.findMany({
    where: { userId: sessao.userId, serverSeq: { gt: BigInt(cursor) } },
    orderBy: { serverSeq: "asc" },
    take: limit + 1
  });
  const temMais = linhas.length > limit;
  const pagina = temMais ? linhas.slice(0, limit) : linhas;
  const proximoCursor = pagina.length > 0 ? String(pagina[pagina.length - 1].serverSeq) : cursor;
  return c.json({ registros: pagina.map(toWire), proximoCursor, temMais });
});

// server/app.ts
var LIMITE_CORPO_API = 2 * 1024 * 1024;
function direcoesCsp() {
  const direcoes = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // script-src sem 'unsafe-inline': o tema anti-flash é theme-init.js externo
    "script-src 'self'",
    // 'unsafe-inline' em styles: atributos style inline (ex.: barra de uso)
    "style-src 'self' 'unsafe-inline'",
    // data: para o QR gerado localmente em ShareSection
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'"
  ];
  if (new URL(env.APP_URL).protocol === "https:") {
    direcoes.push("upgrade-insecure-requests");
  }
  return direcoes;
}
function cabecalhosSeguranca() {
  const headers = {
    "Content-Security-Policy": direcoesCsp().join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin"
  };
  if (new URL(env.APP_URL).protocol === "https:") {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  return headers;
}
var CABECALHOS_SEGURANCA = cabecalhosSeguranca();
function createApp() {
  const app = new Hono3();
  app.use("*", (c, next) => {
    for (const [nome, valor] of Object.entries(CABECALHOS_SEGURANCA)) {
      c.header(nome, valor);
    }
    return next();
  });
  app.use("/api/*", bodyLimit({ maxSize: LIMITE_CORPO_API }));
  app.get("/api/health", (c) => c.json({ ok: true, servico: "base-app" }));
  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
  app.route("/api", syncRoutes);
  app.route("/api", termosRoutes);
  if (env.NODE_ENV === "production" && !process.env.VERCEL) {
    app.use("/assets/*", (c, next) => {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
      return next();
    });
    for (const caminho of ["/sw.js", "/index.html", "/manifest.webmanifest", "/theme-init.js"]) {
      app.use(caminho, (c, next) => {
        c.header("Cache-Control", "no-cache");
        return next();
      });
    }
    app.use("/*", serveStatic({ root: "./dist" }));
    app.get("/*", serveStatic({ path: "./dist/index.html" }));
  }
  return app;
}

// server/vercel.ts
var vercel_default = getRequestListener(createApp().fetch);
export {
  vercel_default as default
};

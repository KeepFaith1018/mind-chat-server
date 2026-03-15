ALTER TABLE "conversations"
ADD COLUMN "summary" TEXT,
ADD COLUMN "summary_updated_at" TIMESTAMPTZ(3);

CREATE TABLE "model_configs" (
  "id" UUID NOT NULL,
  "model_key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "max_context_tokens" INTEGER NOT NULL DEFAULT 64000,
  "supports_web_search" BOOLEAN NOT NULL DEFAULT false,
  "supports_reasoning" BOOLEAN NOT NULL DEFAULT false,
  "supports_file_qa" BOOLEAN NOT NULL DEFAULT false,
  "supports_stream" BOOLEAN NOT NULL DEFAULT true,
  "input_price_per_1k" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "output_price_per_1k" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "config_json" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "model_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "model_configs_model_key_key" ON "model_configs"("model_key");
CREATE INDEX "model_configs_enabled_is_default_idx" ON "model_configs"("enabled", "is_default");

CREATE TABLE "usage_logs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "conversation_id" UUID,
  "model_key" TEXT NOT NULL,
  "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  "completion_tokens" INTEGER NOT NULL DEFAULT 0,
  "reasoning_tokens" INTEGER,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "cost" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "meta_json" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_logs_user_id_created_at_idx" ON "usage_logs"("user_id", "created_at");
CREATE INDEX "usage_logs_conversation_id_created_at_idx" ON "usage_logs"("conversation_id", "created_at");
CREATE INDEX "usage_logs_model_key_created_at_idx" ON "usage_logs"("model_key", "created_at");

ALTER TABLE "usage_logs"
ADD CONSTRAINT "usage_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usage_logs"
ADD CONSTRAINT "usage_logs_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

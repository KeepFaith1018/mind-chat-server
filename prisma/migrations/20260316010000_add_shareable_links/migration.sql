CREATE TABLE "shareable_links" (
  "id" VARCHAR(32) NOT NULL,
  "conversation_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "shareable_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shareable_links_conversation_id_idx"
ON "shareable_links"("conversation_id");

CREATE INDEX "shareable_links_is_active_expires_at_idx"
ON "shareable_links"("is_active", "expires_at");

ALTER TABLE "shareable_links"
ADD CONSTRAINT "shareable_links_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

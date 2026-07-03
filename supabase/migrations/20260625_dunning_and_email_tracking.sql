-- Track Resend delivery status per email
CREATE TABLE IF NOT EXISTS email_queue (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id   text        UNIQUE,
  type              text        NOT NULL,
  to_email          text        NOT NULL,
  user_id           uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  delivered_at      timestamptz,
  bounced_at        timestamptz,
  failed_at         timestamptz
);

CREATE INDEX IF NOT EXISTS email_queue_resend_id_idx
  ON email_queue(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_queue_user_id_idx ON email_queue(user_id);

-- Track QStash messageIds for scheduled dunning emails so they can be cancelled
CREATE TABLE IF NOT EXISTS dunning_jobs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_invoice_id   text        NOT NULL,
  qstash_message_id   text        NOT NULL,
  scheduled_for       timestamptz NOT NULL,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dunning_jobs_user_id_idx        ON dunning_jobs(user_id);
CREATE INDEX IF NOT EXISTS dunning_jobs_invoice_id_idx     ON dunning_jobs(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS dunning_jobs_uncancelled_idx    ON dunning_jobs(stripe_invoice_id)
  WHERE cancelled_at IS NULL;

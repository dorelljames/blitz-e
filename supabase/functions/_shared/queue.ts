import { QueueMessage } from "./types.ts";
import { supabasePgmqSchemaClient } from "./supabase.ts";

// Queue processing utilities
export async function handleMaxRetries(
  queueName: string,
  queueData: QueueMessage,
  onMaxRetries?: () => Promise<void>,
) {
  if (queueData.read_ct > 3) {
    console.log("[INFO] Max retries reached. Marking as failed.");
    await deleteQueueMessage(queueName, queueData.msg_id);
    if (onMaxRetries) {
      await onMaxRetries();
    }
    throw new Error("Max retries reached. Marking as failed.");
  }
}

export async function readFromQueue<T>(
  queueName: string,
  sleepSeconds: number = 120,
  n: number = 1,
) {
  return supabasePgmqSchemaClient.rpc("read", {
    queue_name: queueName,
    sleep_seconds: sleepSeconds,
    n,
  });
}

export async function addToQueue<T>(
  queueName: string,
  message: T,
  sleepSeconds = 0,
) {
  // Ensure queue exists before adding message
  await ensureQueueExists(queueName);

  return supabasePgmqSchemaClient.rpc(
    "send",
    {
      queue_name: queueName,
      message,
      sleep_seconds: sleepSeconds,
    },
  );
}

// Ensure queue exists (create if not)
export async function ensureQueueExists(queueName: string) {
  await supabasePgmqSchemaClient.rpc("create_queue", {
    queue_name: queueName,
  });
}

// Queue management utilities
export async function deleteQueueMessage(queueName: string, messageId: string) {
  if (!messageId) {
    console.log("[INFO] No message ID provided. Skipping action: deletion!");
    return;
  }

  console.log(`[INFO] Deleting message ${messageId} from queue ${queueName}`);
  const response = await supabasePgmqSchemaClient.rpc(
    "delete",
    {
      queue_name: queueName,
      message_id: messageId,
    },
  );
  console.log("[INFO] deleteQueueMessage ~ response:", response);
  return response;
}

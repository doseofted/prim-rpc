/**
 * RPC may either be sent immediately or collected in a queue depending on how
 * calls are configured to be sent (likely due to transport limitations).
 *
 * This is a queue that can either be configured to dispatch immediately, on a
 * timer, or manually with a method (to be provided an an event's callback).
 */
export class PendingRpc {}
